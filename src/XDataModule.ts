import { _xd } from "./XData";
import { XModule } from "./XModule";
import { _xu } from "./XUtils";
import { XCommand } from "./XCommand";
import { _xlog } from "./XLogger";
import type { XpellSkill, XpellSkillCommand } from "./XSkills";

const XDATA_SKILL: XpellSkill = {
  _id: "xdata",
  _title: "XData Runtime State Contract",
  _version: "1.0.0",
  _active: true,
  _type: "xdata-skill",

  _description:
    "Shared runtime state store used by Xpell modules and objects for reactive data binding.",

  _requires: ["xmodule"],

  _core_rules: [
    "Use XData for shared runtime state.",
    "Use _data_source on objects to bind to an XData key.",
    "Use $xdata.key references in generated payloads when a flow or command needs current state.",
    "Do not use XData as hidden local component state.",
    "XData keys should be explicit and stable."
  ],

  _fields: {
    _data_source: "XData key used by XObject/XUIObject for reactive data binding.",
    "$xdata.key": "Runtime payload reference to an XData value."
  }
};

export class XDataModule extends XModule {
  static _name = "xd";
  static _skill: XpellSkill = XDATA_SKILL;

  static _ops: Record<string, XpellSkillCommand> = {

    get: {
      _name: "get",
      _scope: "module",
      _description: "Get value from XData store.",
      _params: {
        key: "XData key."
      }
    },

    set: {
      _name: "set",
      _scope: "module",
      _description: "Set value in XData store.",
      _params: {
        key: "XData key.",
        value: "Value to store.",
        source: "Optional mutation source."
      }
    },

    patch: {
      _name: "patch",
      _scope: "module",
      _description: "Patch plain object into existing XData value.",
      _params: {
        key: "XData key.",
        value: "Plain object patch.",
        source: "Optional mutation source."
      }
    },

    delete: {
      _name: "delete",
      _scope: "module",
      _description: "Delete XData key.",
      _params: {
        key: "XData key.",
        source: "Optional mutation source."
      }
    },

    touch: {
      _name: "touch",
      _scope: "module",
      _description: "Trigger XData subscribers without changing value.",
      _params: {
        key: "XData key.",
        source: "Optional mutation source."
      }
    },

    has: {
      _name: "has",
      _scope: "module",
      _description: "Check if XData key exists.",
      _params: {
        key: "XData key."
      }
    }

  };

  constructor() {
    super({ _name: XDataModule._name });
  }

  async _get(xcmd: XCommand) {
    const params = _xu.ensure_params(xcmd?._params);
    const key = _xu.ensure_string(params.key, "key");

    return {
      _ok: true,
      _result: _xd.get(key)
    };
  }

  async _set(xcmd: XCommand) {
    const params = _xu.ensure_params(xcmd?._params);
    const key = _xu.ensure_string(params.key, "key");
    if (params["_debug"]) {
      _xlog.log("XD SET", { key, value: params.value });
    }
    _xd.set(key, params.value, {
      source: params.source ?? "xd:set"
    });

    return {
      _ok: true,
      _result: { key }
    };
  }

  async _patch(xcmd: XCommand) {
    const params = _xu.ensure_params(xcmd?._params);
    const key = _xu.ensure_string(params.key, "key");

    if (!_xu.is_plain_object(params.value)) {
      throw new Error("xd patch expects value as plain object");
    }

    _xd.patch(key, params.value, {
      source: params.source ?? "xd:patch"
    });

    return {
      _ok: true,
      _result: { key }
    };
  }

  async _delete(xcmd: XCommand) {
    const params = _xu.ensure_params(xcmd?._params);
    const key = _xu.ensure_string(params.key, "key");

    _xd.delete(key, {
      source: params.source ?? "xd:delete"
    });

    return {
      _ok: true,
      _result: { key }
    };
  }

  async _touch(xcmd: XCommand) {
    const params = _xu.ensure_params(xcmd?._params);
    const key = _xu.ensure_string(params.key, "key");

    _xd.touch(key, {
      source: params.source ?? "xd:touch"
    });

    return {
      _ok: true,
      _result: { key }
    };
  }

  async _has(xcmd: XCommand) {
    const params = _xu.ensure_params(xcmd?._params);
    const key = _xu.ensure_string(params.key, "key");

    return {
      _ok: true,
      _result: _xd.has(key)
    };
  }
}
