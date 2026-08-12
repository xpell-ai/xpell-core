import XCommand, { XCommandData } from "./XCommand.js";
import { getXEventManager } from "./XEventManager.js";
import { XLogger as _xlog } from "./XLogger.js";
import XObject from "./XObject.js";
import type { XpellSkillCommand } from "./XSkills.js";

export interface XNanoCommand {
  (
    xCommand: XCommand | XCommandData,
    xObject?: XObject
  ): any;

  _skill?: XpellSkillCommand;
  getSkill?: () => XpellSkillCommand;
}

export type XNanoCommandPack = {
  [k: string]: XNanoCommand;
};

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

export function createNanoCommandWithSkill(
  handler: XNanoCommand,
  skill: XpellSkillCommand
): XNanoCommand {
  handler._skill = skill;
  handler.getSkill = () => skill;

  return handler;
}

export const _xobject_basic_nano_commands: XNanoCommandPack = {
  info: createNanoCommandWithSkill(
    (xCommand, xObject?: XObject) => {
      _xlog.log("XObject id " + xObject?._id);
    },
    {
      _name: "info",
      _scope: "object",
      _description: "Logs the current object's id."
    }
  ),

  log: createNanoCommandWithSkill(
    (xCommand, xObject?: XObject) => {
      if (xCommand._params && xCommand._params["1"]) {
        _xlog.log(xCommand._params["1"]);
      } else {
        _xlog.log(xObject);
      }
    },
    {
      _name: "log",
      _scope: "object",
      _description: "Logs a message or the current object.",
      _params: {
        "1": "Optional message to log."
      }
    }
  ),

  fire: createNanoCommandWithSkill(
    (xCommand, xObject?: XObject) => {
      if (xCommand._params && xCommand._params["1"]) {
        getXEventManager().fire(
          String(xCommand._params["1"]),
          xCommand._params["2"]
        );
      } else if (xCommand._params && xCommand._params["event"]) {
        getXEventManager().fire(
          String(xCommand._params["event"]),
          xCommand._params["data"]
        );
      }
    },
    {
      _name: "fire",
      _scope: "object",
      _description: "Fires an XEventManager event.",
      _params: {
        event: "Event name.",
        data: "Optional event payload.",
        "1": "Event name shorthand.",
        "2": "Event payload shorthand."
      },
      _example: {
        _op: "fire",
        _params: {
          event: "user:login",
          data: {
            source: "button"
          }
        }
      }
    }
  ),

  noop: createNanoCommandWithSkill(
    () => {
      return;
    },
    {
      _name: "noop",
      _scope: "object",
      _description: "No-op command. Useful as a placeholder in sequences."
    }
  ),

  "set-field": createNanoCommandWithSkill(
    (xCommand, xObject?: XObject) => {
      const name = xCommand._params?.["name"];
      const value = xCommand._params?.["value"];

      if (!xObject || typeof name !== "string" || name.length === 0) return;

      if (isDenied(name)) {
        _xlog.error(`set-field denied for protected field: ${name}`);
        return;
      }

      (xObject as any)[name] = value;
    },
    {
      _name: "set-field",
      _scope: "object",
      _description: "Sets a runtime field directly on the current object.",
      _params: {
        name: "Field name.",
        value: "Value to assign."
      },
      _example: {
        _op: "set-field",
        _params: {
          name: "_text",
          value: "Hello"
        }
      }
    }
  ),

  "delete-field": createNanoCommandWithSkill(
    (xCommand, xObject?: XObject) => {
      const name = xCommand._params?.["name"];

      if (!xObject || typeof name !== "string" || name.length === 0) return;

      if (isDenied(name)) {
        _xlog.error(`delete-field denied for protected field: ${name}`);
        return;
      }

      delete (xObject as any)[name];
    },
    {
      _name: "delete-field",
      _scope: "object",
      _description: "Deletes a runtime field from the current object.",
      _params: {
        name: "Field name to delete."
      }
    }
  ),

  "toggle-field": createNanoCommandWithSkill(
    (xCommand, xObject?: XObject) => {
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
    {
      _name: "toggle-field",
      _scope: "object",
      _description: "Toggles a runtime field using boolean-first semantics.",
      _params: {
        name: "Field name to toggle."
      }
    }
  ),

  merge: createNanoCommandWithSkill(
    (xCommand, xObject?: XObject) => {
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
    {
      _name: "merge",
      _scope: "object",
      _description: "Shallow-merges a plain object into a target object field.",
      _params: {
        name: "Target field name.",
        value: "Plain object to merge."
      }
    }
  ),

  "run-seq": createNanoCommandWithSkill(
    async (xCommand, xObject?: XObject) => {
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

          const isSelfTarget =
            target === undefined ||
            target === null ||
            target === "this" ||
            target === xObject._id;

          if (!isSelfTarget) {
            _xlog.error("run-seq rejected non-self _object target");
            return;
          }

          const localCmd = {
            _op: (step as any)._op,
            _params: (step as any)._params
              ? { ...(step as any)._params }
              : undefined
          };

          await xObject.execute(localCmd as any);
          continue;
        }

        _xlog.error(
          "run-seq skipped invalid step; expected string or object with _op"
        );
      }
    },
    {
      _name: "run-seq",
      _scope: "object",
      _description: "Runs a sequence of local nano-command steps in strict order.",
      _params: {
        seq: "Array of command strings or local command objects."
      },
      _example: {
        _op: "run-seq",
        _params: {
          seq: [
            {
              _op: "set-field",
              _params: {
                name: "_debug",
                value: true
              }
            },
            {
              _op: "log",
              _params: {
                "1": "Debug enabled"
              }
            }
          ]
        }
      }
    }
  )
};

export default _xobject_basic_nano_commands;