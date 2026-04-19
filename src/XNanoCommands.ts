/**
 * XNanoCommands — Core Nano Command Definitions
 *
 * Built-in nano commands available to all XObject instances.
 *
 * This module defines the foundational nano commands that form the
 * minimal executable vocabulary of the Xpell runtime. These commands
 * are registered on every XObject and can be invoked via command text,
 * events, or programmatic execution.
 *
 * Nano commands act as the bridge between declarative intent
 * (strings, schemas, AI output) and imperative runtime behavior.
 *
 * One-liner: Nano commands are the verbs of the Xpell runtime.
 *
 * @packageDocumentation
 * @since 2022-07-22
 * @author Tamir Fridman
 * @license MIT
 * @copyright
 * © 2022–present Aime Technologies. All rights reserved.
 */


import XCommand, { XCommandData } from "./XCommand"
import { getXEventManager } from "./XEventManager"
import { XLogger as _xlog } from "./XLogger"
import XObject from "./XObject"

/**
 * Single x-nano-command interface
 */
export interface XNanoCommand  {
    (xCommand: XCommand | XCommandData, xObject: XObject): any
}

/**
 * x-nano-command pack 
 */
export type XNanoCommandPack = {
    [k:string] :XNanoCommand
}

const protected_field_denylist = [
    "_nano_commands",
    "_cache_cmd_txt",
    "_cache_jcmd",
    "_xporter",
    "_event_listeners_ids",
    "_parent",
    "_children"
];

function isDenied(name: string): boolean {
    return protected_field_denylist.includes(name);
}

function isPlainObject(val: any): boolean {
    if (!val || typeof val !== "object" || Array.isArray(val)) return false;
    const proto = Object.getPrototypeOf(val);
    return proto === Object.prototype || proto === null;
}


/**
 * XNanoCommand Pack
 */
export const _xobject_basic_nano_commands:XNanoCommandPack = {
    "info": (xCommand, xObject?: XObject) => {
        _xlog.log("XObject id " + xObject?._id)
    },
    "log": (xCommand, xObject?: XObject) => {
        if (xCommand._params && xCommand._params["1"]) {
            _xlog.log(xCommand._params["1"])
        } else {
            _xlog.log(xObject)
        }
    },
    "fire":(xCommand, xObject ?: XObject) => {
        if (xCommand._params && xCommand._params["1"]) {
            getXEventManager().fire(<string>xCommand._params["1"],<string>xCommand._params["2"])
        } else if (xCommand._params &&  xCommand._params["event"]) {
            getXEventManager().fire(<string>xCommand._params["event"], <string>xCommand._params["data"])
        }
    },
    // no-op utility command for sequence placeholders and explicit "do nothing" steps.
    "noop": () => {
        return;
    },
    // set a runtime field directly on the object.
    "set-field": (xCommand, xObject?: XObject) => {
        const name = xCommand._params?.["name"];
        const value = xCommand._params?.["value"];
        if (!xObject || typeof name !== "string" || name.length === 0) return;
        if (isDenied(name)) {
            _xlog.error(`set-field denied for protected field: ${name}`);
            return;
        }
        (xObject as any)[name] = value;
    },
    // delete a runtime field from the object.
    "delete-field": (xCommand, xObject?: XObject) => {
        const name = xCommand._params?.["name"];
        if (!xObject || typeof name !== "string" || name.length === 0) return;
        if (isDenied(name)) {
            _xlog.error(`delete-field denied for protected field: ${name}`);
            return;
        }
        delete (xObject as any)[name];
    },
    // toggle a field with boolean-first semantics.
    "toggle-field": (xCommand, xObject?: XObject) => {
        const name = xCommand._params?.["name"];
        if (!xObject || typeof name !== "string" || name.length === 0) return;
        if (isDenied(name)) {
            _xlog.error(`toggle-field denied for protected field: ${name}`);
            return;
        }
        const cur = (xObject as any)[name];
        if (typeof cur === "boolean") {
            (xObject as any)[name] = !cur;
        } else if (cur === null || cur === undefined) {
            (xObject as any)[name] = true;
        } else {
            (xObject as any)[name] = false;
        }
    },
    // shallow-merge a plain object into a target object field.
    "merge": (xCommand, xObject?: XObject) => {
        const name = xCommand._params?.["name"];
        const value = xCommand._params?.["value"];
        if (!xObject || typeof name !== "string" || name.length === 0) return;
        if (isDenied(name)) {
            _xlog.error(`merge denied for protected field: ${name}`);
            return;
        }
        if (!isPlainObject(value)) {
            _xlog.error("merge expects _params.value as a plain object");
            return;
        }
        const cur = (xObject as any)[name];
        if (!isPlainObject(cur)) {
            (xObject as any)[name] = {};
        }
        Object.assign((xObject as any)[name], value);
    },
    // run a sequence of steps in strict order (await each).
    "run-seq": async (xCommand, xObject?: XObject) => {
        if (!xObject) return;
        const seq = xCommand._params?.["seq"];
        if (!Array.isArray(seq)) {
            _xlog.error("run-seq expects _params.seq as an array");
            return;
        }
        for (const step of seq) {
            if (typeof step === "string") {
                await xObject.run(`${xObject._id} ${step}`);
                continue;
            }
            if (step && typeof step === "object" && (step as any)._op) {
                const target = (step as any)._object;
                const isSelfTarget = target === undefined || target === null || target === "this" || target === xObject._id;
                if (!isSelfTarget) {
                    _xlog.error("run-seq rejected non-self _object target");
                    return;
                }
                const localCmd = {
                    _op: (step as any)._op,
                    _params: (step as any)._params ? { ...(step as any)._params } : undefined
                };
                await xObject.execute(localCmd as any);
                continue;
            }
            _xlog.error("run-seq skipped invalid step; expected string or object with _op");
        }
    }
}

export default(_xobject_basic_nano_commands)



