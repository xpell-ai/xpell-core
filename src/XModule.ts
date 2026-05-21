/**
 * XModule — Base Runtime Module
 *
 * Abstract base class for all Xpell runtime modules.
 *
 * XModule defines the contract for extending the Xpell interpreter
 * with modular functionality, object ownership, and executable commands.
 *
 * ---
 *
 * ## Module Rules
 *
 * - Every module MUST have a unique name
 * - Each module owns an Object Manager responsible for module-specific XObjects
 * - Child XObjects are managed via their parent and not independently
 * - Modules may execute commands via `XCommand`, JSON, or CLI-style text
 *
 * ---
 *
 * ## Command Exposure Rules
 *
 * - Methods prefixed with `_` are exposed to the Xpell interpreter
 * - Public command names:
 *   - Strip the leading `_`
 *   - Convert spaces and dashes to underscores
 *
 * ---
 *
 * ## Example
 *
 * ```ts
 * class MyModule extends XModule {
 *   _my_Command(xCommand) {
 *     // command implementation
 *   }
 * }
 *
 * // Invocation:
 * XModule.execute("my-Command")
 * ```
 *
 * ---
 *
 * XModule is the extension point that turns the Xpell core
 * into a programmable runtime.
 *
 * One-liner: XModule is how behavior enters the Xpell runtime.
 *
 * @packageDocumentation
 * @since 2022-07-22
 * @author Tamir Fridman
 * @license MIT
 * @copyright
 * © 2022–present Aime Technologies. All rights reserved.
 */

import { _xu } from "./XUtils"
import XParser from "./XParser"
import { XLogger as _xl } from "./XLogger";
import XObjectManager from "./XObjectManager";
import * as _XC from "./XConst"
import { XObjectData, XObject, XObjectPack } from "./XObject";
import XCommand, { XCommandData } from "./XCommand";
import { _xd } from "./XData";
import type {
    XpellSkill,
    XpellSkillCommand
} from "./XSkills";


export type XModuleData = {
    _name: string
}

export const XD_MODULE_NUM_OF_OBJECTS = "engine:module:num-of-objects:";

export const XMODULE_SKILL: XpellSkill = {
    _id: "xmodule",
    _title: "XModule Runtime Contract",
    _version: "1.0.0",
    _active: true,
    _type: "runtime-api-skill",

    _description:
        "Base runtime module contract for object ownership, object packs, and executable underscore-prefixed commands.",

    _core_rules: [
        "Every module must have a unique _name.",
        "Modules expose commands through methods prefixed with underscore.",
        "Command names remove the leading underscore and convert dashes to underscores internally.",
        "Modules own and create registered XObject classes.",
        "Do not mutate another module's objects directly."
    ],

};

/**
 * Xpell Base Module
 * This class represents xpell base module to be extends
 * @class XModule
 * 
 */
export class XModule {
    [k: string]: any
    _id: string
    _name: string;
    _loaded: boolean = false;
    _loading: boolean = false;
    _log_rules: {
        createObject: boolean,
        removeObject: boolean,

    } = {
            createObject: false,
            removeObject: false
        }

    //private object manager instance
    #_object_manger = new XObjectManager()
    //engine: any;  //deprecated remove after spell3d

    static _skill: XpellSkill = XMODULE_SKILL;

    static _ops: Record<string, XpellSkillCommand> = {
        help: {
            _name: "help",
            _scope: "module",
            _description: "Return module help or command-specific help."
        },
        info: {
            _name: "info",
            _scope: "module",
            _description: "Log basic module information."
        }
    };

    static getOwnSkillBase(): XpellSkill {
        return {
            ...this._skill
        };
    }

    getOwnSkill(): XpellSkill {
        const ctor = this.constructor as typeof XModule & {
            _skill?: XpellSkill;
        };

        const base = ctor._skill ?? XMODULE_SKILL;

        return {
            ...base,
            _exports: {
                ...(base._exports ?? {}),
                _modules: [
                    {
                        _name: this._name,
                        _scope: base._type === "server-module-api" ? "server" : "client",
                        _description: base._description,
                        _ops: this.getCommandSkills()
                    }
                ]
            }
        };
    }

    getSkillChain(): XpellSkill[] {
        return [this.getOwnSkill()];
    }

    getObjectSkills(): XpellSkill[] {
        const out: XpellSkill[] = [];
        const seen = new Set<string>();

        for (const cls of Object.values(this.#_object_manger.getObjectClasses())) {
            if (typeof (cls as any).getOwnSkill !== "function") continue;

            const skill = (cls as any).getOwnSkill() as XpellSkill;
            if (!skill?._id) continue;

            if (seen.has(skill._id)) continue;
            seen.add(skill._id);

            out.push(skill);
        }

        return out;
    }

    getCommandSkills(): XpellSkillCommand[] {
        const proto = Object.getPrototypeOf(this);

        const ctor = this.constructor as typeof XModule & {
            _ops?: Record<string, XpellSkillCommand>;
        };

        const explicit_ops = ctor._ops ?? {};

        return Object
            .getOwnPropertyNames(proto)
            .filter(name =>
                name.startsWith("_") &&
                !name.startsWith("__") &&
                typeof (this as any)[name] === "function"
            )
            .map(name => {
                const op_name = name.slice(1).replaceAll("_", "-");

                return explicit_ops[op_name] ?? {
                    _name: op_name,
                    _scope: "module",
                    _description: `Runtime module command: ${op_name}`
                };
            });
    }

    constructor(data: XModuleData) {
        this._name = data._name
        this._id = _xu.guid()


    }

    async load(): Promise<void> {
        if (this._loaded || this._loading) {
            return;
        }
        this._loading = true;
        try {
            await this.onLoad();
            this._loaded = true;
            _xl.log("Module " + this._name + " loaded");
        } finally {
            this._loading = false;
        }
    }

    protected async onLoad(): Promise<void> {
        // optional override
    }

    /**
     * Creates new XObject from data object
     * @param data - The data of the new object (JSON)
     * @return {XObject|*}
     */
    create(data: XObjectData) {

        if (data._debug) {
            _xl.log("Creating object with data", data)
        }
        let xObject: any;
        if (data.hasOwnProperty("_type")) {
            if (data._debug) {
                _xl.log("Object type is", data._type, this.hasObject(data._type as string) ? "found" : "not found", "in module", this._name)
            }
            const type = String(data["_type"]);
            const xObjectClass = this.#_object_manger.getObjectClass(type);
            if (!xObjectClass) {
                throw `Xpell object '${type}' not found in module '${this._name}'`;
            }
            if (
                typeof xObjectClass === "function" &&
                xObjectClass.hasOwnProperty("defaults")
            ) {
                _xu.mergeDefaultsWithData(
                    data,
                    xObjectClass.defaults
                );
            }
            xObject = new xObjectClass(data);
        }
        else {
            xObject = new XObject(data);
        }

        //await spell_object.init();
        this.#_object_manger.addObject(xObject)
        if (data._children) {
            data._children.forEach((child) => {
                const newChild = this.create(child as any);
                xObject.append(newChild);
            });
        }

        xObject.onCreate()
        return xObject;
    }

    /**
     * removes and XObject from the object manager
     * @param objectId op
     */
    remove(objectId: string) {
        const obj: XObject = this.#_object_manger.getObject(objectId);
        if (!obj) return;

        const ids: string[] = [];
        const walk = (o: any) => {
            if (!o?._id) return;
            ids.push(o._id);
            (o._children ?? []).forEach((c: any) => walk(c));
        };
        walk(obj);

        // dispose first (recursively stops listeners/frame/data + clears refs)
        if (typeof (obj as any).dispose === "function") {
            (obj as any).dispose();
        }

        // unregister bottom-up (safer)
        ids.reverse().forEach(id => this.#_object_manger.removeObject(id));
    }


    _info(xCommand: XCommand) {
        _xl.log("module info")
    }

    //xpell interpreter 
    /**
     * Run xpell command - 
     * CLI mode, parse the command to XCommand JSON format and call execute method
     * @param {string} XCommand input - text 
     * @returns command execution result
     */
    async run(stringXCommand: string) {
        if (stringXCommand) {
            let strCmd = stringXCommand.trim()
            //add module name to run command if not exists (in case of direct call from the module)
            if (!strCmd.startsWith(this._name)) {
                strCmd = this._name + " " + strCmd
            }
            let xCommand = XParser.parse(strCmd)
            return await this.execute(xCommand)
        } else {
            throw "Unable to parse Xpell Command"
        }
    }




    /**
     * execute xpell command - CLI mode
     * @param {XCommand} XCommand input (JSON)
     * @returns command execution result
     */
    // inside XModule class
    async execute(xCommand: XCommand | XCommandData) {
        if (!xCommand || !xCommand._op) {
            throw new Error(`Invalid XCommand: missing _op (module: ${this._name})`);
        }

        // 1) Object-targeted command (explicit, safe):  xui #main show
        // Objects can execute ONLY nano commands via XObject.execute()
        const objectId = (xCommand as any)._object as string | undefined;
        if (objectId) {
            const obj = this.#_object_manger.getObject(objectId);
            if (!obj) {
                throw new Error(`Module '${this._name}' cant find object id: ${objectId}`);
            }
            // IMPORTANT: await for future async nano-commands
            return await obj.execute(xCommand as any);
        }

        // 2) Module-level operation: call methods that start with "_" only
        // "my-op" => "_my_op"
        const lop = "_" + xCommand._op.replaceAll("-", "_");
        const fn = (this as any)[lop];

        if (typeof fn === "function") {
            return await fn.call(this, xCommand);
        }

        // 3) No fallback to getObjectByName (backward-safe + avoids ambiguity)
        throw new Error(`Module '${this._name}' cant find op: ${xCommand._op}`);
    }



    /**
     * This method triggers every frame from the Xpell engine.
     * The method can be override by the extending module to support extended onFrame functionality
     * @param frameNumber Current frame number
     */
    async onFrame(frameNumber: number) {
        const omObjects = this.#_object_manger._objects
        const keys = Object.keys(omObjects)
        keys.forEach(key => {
            const onFrameCallBack: XObject = <any>omObjects[key]
            if (onFrameCallBack && onFrameCallBack.onFrame && typeof onFrameCallBack.onFrame === 'function') {
                onFrameCallBack?.onFrame(frameNumber)
            }
        })
        //deprecated usage of _xd
        //_xd._o[this._name + "-om-objects"] = keys.length

        // new usage of _xd
        _xd.set(XD_MODULE_NUM_OF_OBJECTS + this._id, keys.length, {
            source: "xmodule"
        });

    }


    /**
     * X Object Manager
     */

    /**
     * getter for om (object manager) instance
     * @returns {XObjectManager}
     * @deprecated - use _object_manager instead
     * If you wish to get an object from the object manager use
     * getObject directly on the module instead of om.getObject 
     */
    get om() { return this.#_object_manger }
    get _object_manager() { return this.#_object_manger }

    /**
     * Returns the XObject instance from the module Object Manager
     * @param objectId 
     * @returns XObject
     */
    getObject(objectId: string): XObject {
        return this.#_object_manger.getObject(objectId)
    }

    hasObject(name: string) {
        return this.#_object_manger.hasObjectClass(name);
    }

    /**
     * Returns the XObject instance from the module Object Manager
     * Usage:
     * xmodule._o["object-id"] is equivalent to xmodule.getObject("object-id")
     */
    get _o() {
        return this.#_object_manger._objects
    }

    /**
     * Imports external object pack to the engine
     * The object class should be like XObjects with static implementation of getObjects() method
     * @param {XObjects} xObjectPack 
     */
    importObjectPack(xObjectPack: XObjectPack | any) {
        this.#_object_manger.registerObjects(xObjectPack.getObjects())
    }

    /**
     * Imports external object pack to the engine
     * @deprecated - use importObjectPack instead
     * @param xObjectPack 
     */
    importObjects(xObjectPack: XObjectPack | any) {
        this.importObjectPack(xObjectPack)
    }

    /**
     * Imports external objects to the engine
     * The object class should be like XObjects with static implementation of getObjects() method
     * @param xObjectName 
     * @param xObject 
     */
    importObject(xObjectName: string, xObject: XObject) {
        this.#_object_manger.registerObject(xObjectName, xObject)
    }

    // In XModule
    async _help(cmd: any) {
        // Optional: topic filter: xvm help _op:"navigate"
        const op = (cmd?._params?._op ?? cmd?._params?._command ?? "") as string;
        return this.help(op);
    }

    /**
     * Override in modules to provide help text.
     * @param op optional: specific command name (e.g. "navigate")
     */
    help(op?: string): any {
        return {
            module: this._name,
            usage: `${this._name} help`,
            ops: ["help"],
            note: "No help() implemented for this module."
        };
    }

}
export default XModule