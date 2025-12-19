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
import { XEventManager as _xem } from "./XEventManager"
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
            _xem.fire(<string>xCommand._params["1"],<string>xCommand._params["2"])
        } else if (xCommand._params &&  xCommand._params["event"]) {
            _xem.fire(<string>xCommand._params["event"], <string>xCommand._params["data"])
        }
    }
}

export default(_xobject_basic_nano_commands)




