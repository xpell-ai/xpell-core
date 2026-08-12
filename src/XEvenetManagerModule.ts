import XCommand from "./XCommand.js";
import { XModule } from "./XModule.js";
import { _xu } from "./XUtils.js";
import { getXEventManager } from "./XEventManager.js";
import { _xlog } from "./XLogger.js";
import type {
  XpellSkill,
  XpellSkillCommand
} from "./XSkills.js";

const XEM_SKILL: XpellSkill = {
  _id: "xem",
  _title: "XEventManager Runtime Event Bus",
  _version: "1.0.0",
  _active: true,
  _type: "runtime-api-skill",

  _description:
    "Global runtime event bus for decoupled communication between Xpell modules, objects, flows, and UI components.",

  _requires: ["xmodule"],

  _core_rules: [
    "Use XEM for decoupled runtime events.",
    "Use explicit event names and explicit payload objects.",
    "Do not use XEM as state storage.",
    "Use XData for shared state and XEM for notifications/events.",
    "Prefer _on/_once on objects for local event handlers."
  ],

  _fields: {
    "_on": "Object event handler map.",
    "_once": "Object one-time event handler map.",
    "event": "Event name to fire.",
    "data": "Optional event payload."
  },

  _notes: [
    "XEM is process-wide and listener order should not be assumed.",
    "Event payloads should be JSON/data-only."
  ]
};

export class XEventManagerModule extends XModule {
  static _name = "xem";
  static _skill: XpellSkill = XEM_SKILL;

  static _ops: Record<string, XpellSkillCommand> = {
    fire: {
      _name: "fire",
      _scope: "module",
      _description: "Fire a global XEM event with optional payload data.",
      _params: {
        event: "Event name.",
        data: "Optional event payload.",
        _debug: "Optional debug log flag."
      },
      _example: {
        _module: "xem",
        _op: "fire",
        _params: {
          event: "user:login",
          data: {
            source: "login-button"
          }
        }
      }
    }
  };

  constructor() {
    super({ _name: XEventManagerModule._name });
  }

  async _fire(xcmd: XCommand) {
    const params = _xu.ensure_params(xcmd?._params);
    const event_name = _xu.ensure_string(params.event, "event");
    const data = params.data;

    if (params["_debug"]) {
      _xlog.log("xem fire 🔥 ", event_name, data);
    }

    const xem = getXEventManager();
    await xem.fire(event_name, data);
  }
}