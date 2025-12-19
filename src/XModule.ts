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

import XUtils from "./XUtils"
import XParser from "./XParser"
import { XLogger as _xl } from "./XLogger";
import XObjectManager from "./XObjectManager";
import * as _XC from "./XConst"
import { XObjectData, XObject, XObjectPack } from "./XObject";
import XCommand, { XCommandData } from "./XCommand";
import { _xd } from "./Xpell";



export type XModuleData = {
    _name: string
}

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


    constructor(data: XModuleData) {
        this._name = data._name
        this._id = XUtils.guid()


    }

    load() {
        _xl.log("Module " + this._name + " loaded")
    }

    /**
     * Creates new XObject from data object
     * @param data - The data of the new object (JSON)
     * @return {XObject|*}
     */
    create(data: XObjectData) {

        let xObject: any;
        if (data.hasOwnProperty("_type")) {
            if (this.#_object_manger.hasObjectClass(<string>data["_type"])) {
                let xObjectClass = this.#_object_manger.getObjectClass(<string>data["_type"]);
                if (xObjectClass.hasOwnProperty("defaults")) {
                    XUtils.mergeDefaultsWithData(data, xObjectClass.defaults);
                }
                xObject = new xObjectClass(data);
            }
            else {
                throw "Xpell object '" + data["_type"] + "' not found";
            }
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
        _xd._o[this._name + "-om-objects"] = keys.length
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

// export const GenericModule = new XModule({_name:"xmodule"})
export default XModule