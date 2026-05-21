/**
 * XObject — Core Runtime Object Model
 *
 * The foundational primitive of the Xpell runtime.
 *
 * `XObject` is the base class for objects managed by Xpell modules and provides:
 * - Identity (`_id`) and typing (`_type`)
 * - Tree composition (`_children` / `_parent`)
 * - Lifecycle hooks (`onCreate`, `onMount`, `onFrame`, `onData`)
 * - Event binding via `XEventManager` (`_on` / `_once`)
 * - Nano-command execution (`run` / `execute`) powered by `XParser` + `XCommand`
 * - Data-source integration (`_data_source`) and XData export (`toXData`)
 *
 * XObject is module-agnostic: UI (XUI), navigation (XVM), data (XDB), and transport
 * layers build on top of it without changing its core contract.
 *
 * One-liner: XObject is the universal runtime node for Xpell.
 *
 * @packageDocumentation
 * @since 2022-07-22
 * @author Tamir Fridman
 * @license MIT
 * @copyright
 * © 2022–present Aime Technologies. All rights reserved.
 */


import { _xu } from "./XUtils"
import XCommand, { XCommandData } from "./XCommand";
import XParser from "./XParser"
import { XLogger as _xlog } from "./XLogger";
import { XEventListenerOptions, getXEventManager } from "./XEventManager";
import { _xobject_basic_nano_commands, XNanoCommandPack, XNanoCommand } from "./XNanoCommands";
import _xd, { XDataStore } from "./XData";
import { getXRuntime } from "./XRuntime";
import type { XpellSkill, XpellSkillCommand } from "./XSkills";


export const XOBJECT_SKILL: XpellSkill = {
    _id: "xobject",
    _title: "XObject Core Runtime Contract",
    _version: "1.0.0",
    _active: true,
    _type: "runtime-api-skill",

    _description:
        "Base runtime object for identity, typing, composition, lifecycle hooks, events, data binding, and nano-command execution.",

    _fields: {
        _id: "Unique object id.",
        _type: "Registered runtime object type.",
        _name: "Optional object name.",
        _children: "Child objects/data.",
        _data_source: "XData key to bind this object to.",
        _on: "Event handlers map.",
        _once: "One-time event handlers map.",
        _on_create: "Lifecycle handler after object creation.",
        _on_mount: "Lifecycle handler after mount.",
        _on_frame: "Frame lifecycle handler.",
        _on_data: "Data-source lifecycle handler.",
        _process_frame: "Enable/disable frame processing.",
        _process_data: "Enable/disable data-source processing.",
        _debug: "Enable object debug logs."
    },

    _exports: {
        _xui_fields: [
            "_id",
            "_type",
            "_name",
            "_children",
            "_data_source",
            "_on",
            "_once",
            "_on_create",
            "_on_mount",
            "_on_frame",
            "_on_data",
            "_process_frame",
            "_process_data",
            "_debug"
        ],
    },

    _core_rules: [
        "All Xpell runtime objects inherit this contract.",
        "Generated object JSON must be data-only.",
        "Do not generate JavaScript functions.",
        "Use _children for composition.",
        "Use _on/_once with nano-command strings or data-only command objects."
    ],

    _notes: [
        "Runtime methods include parse, append, run, execute, bindDataSource, unbindDataSource, toXData, dispose, and removeChild.",
        "Most prompts should use this skill as a compact dependency summary, not full context."
    ]
};


export type wordsList = { [k: string]: string }

const reservedWords: wordsList = { _children: "child nodes" }
// const xpell_object_html_fields_mapping = { "_id": "id", "css-class": "class", "animation": "xyz", "input-type": "type" };



export type XValue =
    | string
    | number
    | boolean
    | null
    | undefined
    | Function
    | object
    | any[]
    | XValue[]
    | { [k: string]: XValue };

export interface IXData {
    [k: string]: XValue;
}



export interface XDataXporterHandler {
    (inst: any): any
}

export type XDataInstanceXporter = {
    cls: any, //the Object Class to replace with the exporter output
    handler: XDataXporterHandler //the class handler (exporter function)
}

export type XDataXporter = {
    _ignore_fields: string[],
    _instance_xporters: {
        [id: string]: XDataInstanceXporter
    }
}

export type XObjectOnEventHandler =
    | ((xObject: XObject, data?: any) => void)
    | string
    | XCommandData
    | XObjectOnEventHandler[];
export interface XObjectOnEventIndex {
    [eventName: string]: XObjectOnEventHandler
}

type XObjectHandler = Function | string | XCommandData | XObjectHandler[];

export type XObjectData = {
    [k: string]: XValue;

    _id?: string;
    _type?: string; // keep optional if you rely on defaults in constructors
    _children?: Array<XObject | XObjectData>;

    _name?: string;
    _data_source?: string;

    _on?: XObjectOnEventIndex;
    _once?: XObjectOnEventIndex;

    _on_create?: XObjectHandler;
    _on_mount?: XObjectHandler;
    _on_frame?: XObjectHandler;
    _on_data?: XObjectHandler;

    _process_frame?: boolean;
    _process_data?: boolean;

    _nano_commands?: XNanoCommandPack;
    _debug?: boolean;
};


/**
 * XObject class
 * @class XObject
 */
export class XObject {
    [k: string]: string | null | [] | undefined | Function | boolean | number | {} | null
    static _xtype = "object"
    _id: string;
    _type: string;
    _children: Array<XObject | XObjectData> = []
    _parent: XObject | null = null
    _name?: string
    _data_source?: string //XData source
    _debug?: boolean //debug mode for the XObject
    _on: XObjectOnEventIndex = {}
    _once: XObjectOnEventIndex = {}
    _on_create?: XObjectHandler | undefined
    _on_mount?: XObjectHandler | undefined
    _on_frame?: XObjectHandler | undefined
    _on_data?: XObjectHandler | undefined
    _on_event?: XObjectHandler | undefined


    //real-time controllers
    _process_frame: boolean = true
    _process_data: boolean = true


    protected _xem_options: XEventListenerOptions

    //local cache for nano commands

    protected _nano_commands: { [k: string]: XNanoCommand } = {}
    protected _cache_cmd_txt?: string;
    protected _cache_jcmd?: any;
    protected _event_listeners_ids: { [eventName: string]: string[] } = {}
    protected _event_parsed: boolean = false
    protected _mounted: boolean = false
    protected _xporter: XDataXporter = {
        _ignore_fields: ["_to_xdata_ignore_fields", "_xporter", "_children", "_on", "_once",
            "_on_create", "_on_mount", "_on_frame", "_on_data", "_process_frame", "_process_data",
            "_parent", "_event_listeners_ids", "_event_parsed", "_mounted", "_debug"],
        _instance_xporters: {}
    }

    private _xd_unsub?: () => void;
    private _xd_bound_key?: string;


    /***
     * Skills
     */

    static _skill: XpellSkill = XOBJECT_SKILL

    static getOwnSkill(): XpellSkill {
        const ctor = this as typeof XObject & {
            _skill?: XpellSkill;
            getNanoCommandSkills?: () => XpellSkillCommand[];
        };

        const base = ctor._skill ?? XOBJECT_SKILL;

        return {
            ...base,
            _exports: {
                ...(base._exports ?? {}),
                _nano_commands:
                    ctor.getNanoCommandSkills?.() ?? []
            }
        };
    }

    static getSkillChain(): XpellSkill[] {
        const parent = Object.getPrototypeOf(this);

        const parent_chain =
            parent && typeof parent.getSkillChain === "function"
                ? parent.getSkillChain()
                : [];

        const own_skill =
            Object.prototype.hasOwnProperty.call(this, "_skill")
                ? this.getOwnSkill()
                : null;

        return own_skill
            ? [...parent_chain, own_skill]
            : parent_chain;
    }

    static getOwnNanoCommands(): XNanoCommandPack {
        return {
            ..._xobject_basic_nano_commands
        };
    }

    static getNanoCommands(): XNanoCommandPack {
        return {
            ...this.getOwnNanoCommands()
        };
    }

    static getNanoCommandSkills(): XpellSkillCommand[] {
        const ownsNanoCommands =
            Object.prototype.hasOwnProperty.call(
                this,
                "getOwnNanoCommands"
            );

        if (!ownsNanoCommands) {
            return [];
        }

        return Object
            .values(this.getOwnNanoCommands())
            .map((cmd: any) =>
                cmd.getSkill?.() ??
                cmd._skill
            )
            .filter(Boolean) as XpellSkillCommand[];
    }

    /**
     * XObject constructor is creating the object and adding all the data keys to the XObject instance
     * @param data constructor input data (object)
     * @param defaults - defaults to merge with data
     * @param skipParse - skip data parsing 
     * if override this method make sure to call super.init(data,skipParse) and to set skipParse to true
     */
    constructor(data: XObjectData, defaults?: any, skipParse?: boolean) {
        if (defaults) {
            _xu.mergeDefaultsWithData(data, defaults)
        }

        this._id = (data && data._id) ? data._id : "xo-" + _xu.guid();
        this._type = "object" //default type
        this._children = []
        this._nano_commands = {}
        this.addNanoCommandPack(_xobject_basic_nano_commands)
        if (data && data.hasOwnProperty("_nano_commands") && data._nano_commands) {
            this.addNanoCommandPack(data._nano_commands)
            delete data._nano_commands //important to delete the nano commands from the data
        }


        //add Xporter ignore field and instance handler (uses as example also)
        this.addXporterDataIgnoreFields(["_nano_commands"])
        this.addXporterInstanceXporter(XObject, (objectInstance: XObject) => {
            return objectInstance.toXData()
        })
        this._xem_options = {
            // _instance:_xem
            // _object: this
            // _support_html: true
        }
        if (!skipParse && data) this.parse(data, reservedWords);
        // this.init(data, skipParse)


    }


    log(message?: any, ...optionalParams: any[]) {
        if (this._debug) {
            if (message) {
                _xlog.log(this._type + "->" + this._id + "]", message, ...optionalParams)
            }
        }
    }

    /**
     * Initialize the XObject
     * @param data - data to parse (XObjectData)
     * @param skipParse - skip data parsing
     * @deprecated - use parse method instead
     */
    init(data?: any, skipParse?: boolean) {
        if (!skipParse && data) {
            this.parse(data, reservedWords);
        }
    }

    parseEvents(options?: XEventListenerOptions) {
        if (!this._event_parsed) {
            if (!options) options = this._xem_options
            Object.keys(this._on).forEach(eventName => {
                this.addEventListener(eventName, this._on[eventName], options)
                // if (typeof this._on[eventName] === "function") {
                // }
                // else if(typeof this._on[eventName] === "string") {
                //     // console.error("string event handler not supported yet")
                //     _xlog.log("try string event handler " + eventName)
                // }
                // else {
                //     throw new Error("event handler must be a function " + eventName)
                // }
            })

            const onceOptions: XEventListenerOptions = {}
            Object.assign(onceOptions, options)
            onceOptions._once = true

            Object.keys(this._once).forEach(eventName => {
                this.addEventListener(eventName, this._once[eventName], onceOptions)

            })
            this._event_parsed = true
        }
    }


    addEventListener(eventName: string, handler: XObjectOnEventHandler | string | any, options?: XEventListenerOptions): string {
        if (!options) {
            options = this._xem_options;
        }

        const _final_handler = async (eventData?: any) => {
            await this.checkAndRunInternalFunction(handler, eventData);
        };

        const event_listener_id = getXEventManager().on(eventName, _final_handler, options, this);

        if (!this._event_listeners_ids[eventName]) {
            this._event_listeners_ids[eventName] = [];
        }
        this._event_listeners_ids[eventName].push(event_listener_id);
        return event_listener_id;
    }


    removeEventListener(eventName: string) {
        const listenerIds = this._event_listeners_ids[eventName]
        if (listenerIds && listenerIds.length) {
            listenerIds.forEach((listenerId) => {
                getXEventManager().remove(listenerId)
            })
            delete this._event_listeners_ids[eventName]
        }
    }

    removeAllEventListeners() {
        const keys = Object.keys(this._event_listeners_ids)
        keys.forEach(key => this.removeEventListener(key))
    }



    /**
     * Append a child XObject to this XObject
     * @param xobject 
     */
    append(xobject: XObject) {
        this._children?.push(xobject)
        xobject._parent = this
    }

    /**
     * Add single nano command to the object
     * @param commandName - the nano command name
     * @param nanoCommandFunction 
     */
    addNanoCommand(commandName: string, nanoCommandFunction: XNanoCommand) {
        if (typeof nanoCommandFunction === 'function') {
            // _xlog.log("command " + commandName + " loaded to xobject " + this._id)
            this._nano_commands[commandName] = nanoCommandFunction
        }
    }

    addNanoCommandPack(ncPack: XNanoCommandPack) {
        if (ncPack) {
            Object.keys(ncPack).forEach((key: string) => {
                this.addNanoCommand(key, ncPack[key])
            })
        }
    }

    /**
     * List of fields to ignore when exporting the xobject to XData or string format
     * @param <string[]> ignoreFields - an array with all the fields to ignore 
     */
    addXporterDataIgnoreFields(ignoreFields: string[]) {
        this._xporter._ignore_fields = this._xporter._ignore_fields.concat(ignoreFields)
    }

    /**
     * Add XData Xporter instance handler
     * @param <XDataInstanceXporter> ie - the instance exporter object
     */
    addXporterInstanceXporter(classOfInstance: any, handler: XDataXporterHandler) {
        const xporterName = _xu.guid()
        this._xporter._instance_xporters[xporterName] = {
            cls: classOfInstance,
            handler: handler
        }
    }







    /**
     * Parse data to the XObject
     * @param data data to parse
     * @param ignore - lis of words to ignore in the parse process
     */
    parse(data: XObjectData, ignore: any = reservedWords) {

        let cdata = Object.keys(data);
        cdata.forEach(field => {
            if (!ignore.hasOwnProperty(field) && data.hasOwnProperty(field)) {
                this[field] = <any>data[field];
            }
        });
    }

    /**
     * Parse data to the XObject
     * @param data data to parse
     * @param {object} fields- object with fields and default values (IXData format)
     * 
     * fields example = {
     *  _name : "default-name",
     * ...
     * }
     */
    parseFieldsFromXDataObject(data: XObjectData, fields: { [name: string]: any }) {

        let cdata = Object.keys(fields);
        cdata.forEach((field: string) => {
            if (data.hasOwnProperty(field)) {
                this[field] = <any>data[field];
            } else {
                this[field] = fields[field]
            }
        })
    }


    /**
     * Parse list of fields from IXObjectData to the class
     * @param {IXObjectData} data -  the data
     * @param {Array<string>} fields - array of field names (string)
     * @param checkNonXParams - also check non Xpell fields (fields that not starting with "_" sign)
     */
    parseFields(data: XObjectData, fields: Array<string>, checkNonXParams?: boolean) {

        fields.forEach(field => {
            if (data.hasOwnProperty(field)) {
                this[field] = <any>data[field];
            } else if (checkNonXParams && field.startsWith("_")) {
                const choppedField = field.substring(1) // remove "_" from field name "_id" = "id"
                if (data.hasOwnProperty(choppedField)) {
                    this[field] = <any>data[choppedField]
                    this[choppedField] = <any>data[choppedField] //add both to support Three arguments
                }
            }
        })
    }




    /**
     * this method triggered after the HTML DOM object has been created and added to the parent element
     * support external _on_create anonymous function in the , example:
     * _on_create: async (xObject) => {
     *      // xObject -> The XObject parent of the _on_create function, use instead of this keyword
     *      // write code that will be executed each frame.
     *      // make sure to write async anonymous function. 
     * }
     * 
    */
    async onCreate() {
        if (this._on_create) {
            this.checkAndRunInternalFunction(this._on_create)
        } else if (this._on && this._on["create"]) {
            this.checkAndRunInternalFunction(this._on["create"])
        } else if (this._once && this._once["create"]) {
            this.checkAndRunInternalFunction(this._once["create"])
        }
    }


    private async runCmd(cmd: XCommand | XCommandData): Promise<void> {
        const xcmd = (cmd instanceof XCommand) ? cmd : new XCommand(cmd);
        await this.execute(xcmd);
    }

    protected async checkAndRunInternalFunction(func: any, ...params: any) {

        const resolveValue = (val: any): any => {

            if (typeof val === "string") {

                if (val === "$event") return params[0];

                if (val.startsWith("$event.")) {
                    const path = val.slice(7).split(".");
                    let cur = params[0];

                    for (const p of path) {
                        if (cur == null) return undefined;
                        cur = cur[p];
                    }

                    return cur;
                }

                if (val === "$data") return params[0];

                if (val.startsWith("$data.")) {
                    const path = val.slice(6).split(".");
                    let cur = params[0];

                    for (const p of path) {
                        if (cur == null) return undefined;
                        cur = cur[p];
                    }

                    return cur;
                }

                return val;
            }

            if (Array.isArray(val)) {
                return val.map(resolveValue);
            }

            if (val && typeof val === "object") {
                const out: any = {};

                for (const k of Object.keys(val)) {
                    out[k] = resolveValue(val[k]);
                }

                return out;
            }

            return val;
        };

        const runOne = async (
            handler: any,
            previous_result?: any
        ) => {

            if (
                previous_result !== undefined &&
                handler &&
                typeof handler === "object" &&
                !Array.isArray(handler)
            ) {
                handler = {
                    ...handler,
                    _params: {
                        ...(handler._params ?? {}),
                        _prev: previous_result
                    }
                };
            }

            return await this.checkAndRunInternalFunction(
                handler,
                ...params
            );
        };

        // 1. ARRAY -> sequential execution, backward compatible
        if (Array.isArray(func)) {

            let last_result: any;

            for (const item of func) {
                last_result = await runOne(
                    item,
                    last_result
                );
            }

            return last_result;
        }

        // 2. FUNCTION -> direct call
        if (typeof func === "function") {
            return await func(this, ...params);
        }

        // 3. STRING -> parse -> execute
        if (typeof func === "string") {
            const parsed =
                XParser.parseObjectCommand(
                    `${this._id} ${func}`
                );

            if (params.length > 0) {
                parsed._params = parsed._params || {};

                const payload = params[0];

                parsed._params._event = payload;

                // backward compatibility
                if (!parsed._params.data && !payload?.target) {
                    parsed._params.data = payload;
                }
            }

            return await this.execute(parsed);
        }

        // 4. JSON MULTI-COMMAND OBJECT -> new structured mode
        if (
            func &&
            typeof func === "object" &&
            Array.isArray((func as any)._commands)
        ) {
            const cfg = func as any;

            const mode =
                typeof cfg._mode === "string"
                    ? cfg._mode
                    : "sequence";

            const stop_on_error =
                cfg._stop_on_error !== false;

            const commands =
                cfg._commands;

            if (mode === "parallel") {
                const results =
                    await Promise.allSettled(
                        commands.map((cmd: any) =>
                            runOne(cmd)
                        )
                    );

                const rejected =
                    results.find(
                        (r) => r.status === "rejected"
                    ) as PromiseRejectedResult | undefined;

                if (rejected && stop_on_error) {
                    throw rejected.reason;
                }

                return results;
            }

            // sequence / chain
            let last_result: any;

            for (const cmd of commands) {
                try {
                    last_result = await runOne(
                        cmd,
                        mode === "chain"
                            ? last_result
                            : undefined
                    );
                } catch (err) {
                    _xlog.error(
                        this._type + "->" + this._id + "] command sequence failed",
                        err
                    );

                    if (stop_on_error) {
                        throw err;
                    }
                }
            }

            return last_result;
        }

        // 5. JSON command object -> existing behavior
        if (func && typeof func === "object" && (func as any)._op) {
            const fcmd = func as any;

            const target =
                fcmd._object === undefined ||
                    fcmd._object === null ||
                    fcmd._object === "this"
                    ? this._id
                    : fcmd._object;

            if (target !== this._id) {
                _xlog.error(
                    "XObject JSON handler target not supported; expected _object omitted/'this'/" + this._id
                );
                return;
            }

            const localCmd: any = {
                ...fcmd,
                _params: fcmd._params
                    ? { ...fcmd._params }
                    : {},
            };

            if (params.length > 0) {
                const payload = params[0];

                if (
                    !Object.prototype.hasOwnProperty.call(
                        localCmd._params,
                        "data"
                    )
                ) {
                    localCmd._params.data = payload;
                }

                if (
                    !Object.prototype.hasOwnProperty.call(
                        localCmd._params,
                        "_event"
                    )
                ) {
                    localCmd._params._event = payload;
                }
            }

            localCmd._params =
                resolveValue(localCmd._params);

            if (this._debug) {
                _xlog.log(
                    this._type + "->" + this._id + "]",
                    "JSON handler executed locally",
                    localCmd
                );
            }

            return await this.execute(localCmd as any);
        }

        // 6. INVALID
        _xlog.error(
            this._type + "->" + this._id + "] invalid handler in checkAndRunInternalFunction",
            func
        );
    }


    /**
     * Triggers when the object is being mounted to other element
     * support external _on_create anonymous function in the , example:
     * _on_mount: async (xObject) => {
     *      // xObject -> The XObject parent of the _on_mount function, use instead of this keyword
     *      // write code that will be executed each frame.
     *      // make sure to write async anonymous function. 
     * }
     */
    async onMount() {
        if (this._mounted) return;

        // parse events after creation
        this.parseEvents(this._xem_options);

        // ✅ bind once when object becomes active
        if (this._process_data && typeof this._data_source === "string" && this._data_source.length > 0) {
            this.bindDataSource(this._data_source, { initial: true });
        }


        // run on mount handlers
        if (this._on_mount) {
            await this.checkAndRunInternalFunction(this._on_mount);
        } else if (this._on && this._on["mount"]) {
            await this.checkAndRunInternalFunction(this._on["mount"]);
        } else if (this._once && this._once["mount"]) {
            await this.checkAndRunInternalFunction(this._once["mount"]);
        }

        this._mounted = true;

        for (const child of this._children) {
            if (child.onMount && typeof child.onMount === "function") child.onMount();
        }
    }



    emptyDataSource() {
        const key = this._data_source;
        if (typeof key !== "string" || key.length === 0) return;

        const type = (this as any)._type ?? this.constructor.name;
        const id = (this as any)._id ?? "no-id";
        _xd.delete(key, { source: `${type}#${id}.emptyDataSource` });
    }



    /**
     * Triggers when new data is being received from the data source
     * @param data - the data
     * if override this method make sure to call super.onData(data) to run the _on_data attribute
     */
    async onData(data: any) {
        if (this._process_data) {
            if (this._on_data) {
                this.checkAndRunInternalFunction(this._on_data, data)
            } else if (this._on && this._on["data"]) {
                this.checkAndRunInternalFunction(this._on["data"], data)
            } else if (this._once && this._once["data"]) {
                this.checkAndRunInternalFunction(this._once["data"], data)
            }
        }
    }

    /**
     * Triggers from Xpell frame every frame
     * Support _on_frame atrribute that can be XCommand string or function
     * @param {number} frameNumber 
     * 
     * XObject supports
     * 1. External _on_frame anonymous function in the , example:
     * _on_frame: async (xObject,frameNumber) => {
     *      // xObject -> The XObject parent of the _on_frame function, use instead of this keyword
     *      // frameNumber = Xpell current frame number 
     *      // write code that will be executed each frame.
     *      // make sure to write async anonymous function. 
     *      // be wise with the function execution and try to keep it in the 15ms running time to support 60 FPS
     * }
     * 
     * 2. String execution of nano commands
     * 
     * _on_frame: "nano command text"
     * 
     */
    async onFrame(frameNumber: number) {
        if (this._process_frame) {
            if (this._on_frame) {
                this.checkAndRunInternalFunction(this._on_frame, frameNumber);
            } else if (this._on && this._on["frame"]) {
                this.checkAndRunInternalFunction(this._on["frame"], frameNumber);
            } else if (this._once && this._once["frame"]) {
                this.checkAndRunInternalFunction(this._once["frame"], frameNumber);
            }
        }

        // NOTE: XData2: data delivery is subscription-based (bind), not per-frame polling.

        for (const child of this._children) {
            if (child.onFrame && typeof child.onFrame === "function") {
                child.onFrame(frameNumber);
            }
        }
    }






    /**
     * Runs object nano commands
     * @param nanoCommand - object nano command (string)
     * @param cache - cache last command to prevent multiple parsing on the same command
     */

    async run(nanoCommand: string, cache = true) {

        let jcmd: XCommand = (this._cache_cmd_txt && this._cache_cmd_txt == nanoCommand) ? <XCommand>this._cache_jcmd : <any>XParser.parseObjectCommand(nanoCommand) //XParser.parse(nanoCommand)        
        //cache command to prevent parsing in every frame
        if (cache) {
            this._cache_cmd_txt = nanoCommand
            this._cache_jcmd = jcmd
        }
        await this.execute(jcmd) //execute nano commands

    }


    /**
     * Execute XCommand within the XObject Nano Commands
     * @param xCommand XCommand to execute
     * 
     * Nano command example:
     * 
     * "set-text" : (xCommand,xObject) => {
     *      xObject.setText(xCommands.params.text)
     * }
     * 
     */
    async execute(xCommand: XCommand | XCommandData) {

        const op = xCommand?._op;

        if (!op) {
            _xlog.error(this._id + " missing _op in command");
            return;
        }

        // --------------------------------------------------
        // 1. MODULE ROUTING HAS PRIORITY
        // --------------------------------------------------

        const moduleName = (xCommand as any)?._module;

        if (moduleName) {
            try {

                const _x = getXRuntime();

                return await _x.execute({
                    ...(xCommand as any),
                    _module: moduleName
                });

            } catch (err) {

                _xlog.error(
                    this._id +
                    " module execution failed: " +
                    moduleName + "." + op + " " + err
                );

                return;
            }
        }

        // --------------------------------------------------
        // 2. LOCAL NANO COMMANDS
        // --------------------------------------------------

        if (this._nano_commands[op]) {
            try {
                return await this._nano_commands[op](
                    <XCommand>xCommand,
                    this
                );

            } catch (err) {

                _xlog.error(
                    this._id +
                    " has error with command name " +
                    op + " " + err
                );

                return;
            }
        }

        // --------------------------------------------------
        // 3. DEFAULT
        // --------------------------------------------------

        _xlog.error(this._id + " has no command name " + op);
    }

    /**
     * Return an IXObjectData JSON representation of the XObject
     * @returns IXObjectData
     */
    toXData(): IXData {
        const out: IXData = {}
        Object.keys(this).forEach(field => {
            if (!this._xporter._ignore_fields.includes(field) &&
                this.hasOwnProperty(field) && this[field] !== undefined) {
                const tf = this[field]
                if (typeof tf === "function") {
                    // Functions are omitted from XData export to avoid serialization of executable code.
                    return
                } else if (typeof tf === "object") {
                    const xporters = Object.keys(this._xporter._instance_xporters)
                    let regField = true
                    xporters.forEach(xporter => {
                        const xp = this._xporter._instance_xporters[xporter]
                        if (tf instanceof this._xporter._instance_xporters[xporter].cls) {
                            out[field] = this._xporter._instance_xporters[xporter].handler(tf)
                            regField = false
                        }
                    })

                    if (regField) {
                        out[field] = tf as any
                    }
                }
                else {
                    out[field] = tf
                }

            }
        })
        //children are being created separately
        out._children = []
        if (this._children.length > 0) {
            this._children.forEach(child => {
                if (typeof child.toXData === "function") {
                    (out._children as Array<IXData>)?.push(child.toXData())
                }
            })
        }

        return out
    }

    /**
     * Return a string representation of the XObject
     * @returns string
     */
    toString() {
        return JSON.stringify(this.toXData())
    }


    clearAttributes(attributes: Array<string>) {
        attributes.forEach(attr => {
            if (this.hasOwnProperty(attr)) {
                this[attr] = <any>null
                delete this[attr]
            }
        })
    }



    bindDataSource(key?: string, opts?: { initial?: boolean }) {
        const initial = opts?.initial ?? true;

        const k = (key ?? this._data_source);
        if (typeof k !== "string" || k.length === 0) return;
        if (!this._process_data) return;

        // If already bound to same key, do nothing
        if (this._xd_bound_key === k && this._xd_unsub) return;

        // Unbind previous key
        this.unbindDataSource();

        // Persist the source key
        this._data_source = k;
        this._xd_bound_key = k;

        const type = (this as any)._type ?? this.constructor.name;
        const id = (this as any)._id ?? "no-id";
        const src = `${type}#${id}.bindDataSource`;

        // Subscribe (XData2)
        this._xd_unsub = _xd.on(k, async (ch) => {
            await this.onData(ch.value);
        });

        // Optional initial push (mimics old "if already set, deliver once")
        if (initial && _xd.has(k)) {
            this.onData(_xd.get(k));
        }
    }

    unbindDataSource() {
        this._xd_unsub?.();
        this._xd_unsub = undefined;
        this._xd_bound_key = undefined;
    }



    /**
     * Dispose the XObject and all its children
     */
    async dispose() {
        this.unbindDataSource();

        if (this._parent) {
            //remove the instance from the parent children array
            const index = this._parent._children.indexOf(this)
            if (index > -1) this._parent._children.splice(index, 1)
        }
        this._process_data = false
        this._process_frame = false
        this.removeAllEventListeners()
        this.clearAttributes(["_cache_cmd_txt", "_cache_jcmd", "_nano_commands", "_event_listeners_ids", "_parent", "_on", "_once", "_xem_options", "_xporter"])
        if (this._children) {
            this._children.forEach(child => {
                if (typeof child.dispose == "function") {
                    child.dispose()
                }
            })
        }
        this._children = []
    }

    /**
     * Remove a child from the XObject )
     * @param child - the child to
     * @returns void
        */
    removeChild(child: XObject, dispose = false) {
        if (dispose) {
            child.dispose()
        } else {
            const index = this._children.indexOf(child)
            if (index > -1) this._children.splice(index, 1)
            child._parent = null
        }

    }

    /**
     * @param child - the child to add
     * @deprecated use append method instead
     */
    addChild(child: XObject) {
        this.append(child)
    }

}


/**
 * ObjectPack class for multi object registration
 */
export class XObjectPack {
    [k: string]: any
    /**
     * Get all registered object in this ObjectPack
     * @returns XObject dictionary
     */
    static getObjects(): object {
        return {
            "object": XObject
        }
    }
}


export default XObject
