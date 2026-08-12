import assert from "node:assert/strict";
import test from "node:test";
import {
  XModule,
  XCommandRuntime,
  XDataModule,
  XpellEngine,
  XObject,
  _XEventManager,
  setXEventManager,
  _xd
} from "../dist/xpell-core.es.js";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const testScheduler = { start() {}, stop() {} };

class SkillMetadataModule extends XModule {
  static _skill = {
    _id: "core-skill-metadata-test",
    _title: "Core Skill Metadata Test",
    _version: "1.0.0",
    _active: true,
    _type: "runtime-api-skill",
    _description: "Verifies optional runtime metadata survives skill export handling.",
    _exports: {
      _client_ops: [
        {
          _name: "client-op",
          _scope: "client"
        }
      ],
      _tests: [
        {
          _id: "core.skill.metadata",
          _title: "Core skill metadata survives",
          _owner: "@xpell/core",
          _suite: "core.skills",
          _scope: "runtime",
          _runtime: "shared",
          _tags: ["core", "skills"]
        }
      ],
      _test_profiles: [
        {
          _id: "core-runtime",
          _title: "Core Runtime",
          _includes: ["core.skill.*"]
        }
      ]
    }
  };

  constructor(name = "core-skill-metadata") {
    super({ _name: name });
  }

  _ping() {
    return { _ok: true, _result: "pong" };
  }
}

test("XSkill test metadata exports survive module skill handling", async () => {
  const mod = new SkillMetadataModule();
  const ownSkill = mod.getOwnSkill();

  assert.equal(ownSkill._exports._tests[0]._id, "core.skill.metadata");
  assert.equal(ownSkill._exports._test_profiles[0]._id, "core-runtime");
  assert.equal(ownSkill._exports._client_ops[0]._name, "client-op");
  assert.equal(ownSkill._exports._modules[0]._name, "core-skill-metadata");
  assert.equal(ownSkill._exports._modules[0]._ops[0]._name, "ping");

  const engine = new XpellEngine({ _schedule_frame: testScheduler });
  await engine.loadModuleAsync(mod);
  const skills = engine.getSkills();
  const runtimeSkill = skills._modules
    .find((entry) => entry._name === "core-skill-metadata")
    ._skills.find((skill) => skill._id === "core-skill-metadata-test");

  assert.equal(runtimeSkill._exports._tests[0]._id, "core.skill.metadata");
  assert.equal(runtimeSkill._exports._test_profiles[0]._id, "core-runtime");
  assert.equal(runtimeSkill._exports._client_ops[0]._name, "client-op");
  assert.equal(runtimeSkill._exports._modules[0]._ops[0]._name, "ping");
});

class MockXdbClientModule extends XModule {
  constructor(seed = {}) {
    super({ _name: "xdb-client" });
    this.values = new Map(Object.entries(seed));
    this.gets = [];
    this.saves = [];
  }

  _get_string(xcmd) {
    const key = xcmd._params?._key;
    this.gets.push(key);

    return {
      _ok: true,
      _result: {
        value: this.values.get(key)
      }
    };
  }

  _save_string(xcmd) {
    const key = xcmd._params?._key;
    const value = xcmd._params?._value;

    this.saves.push({ key, value });
    this.values.set(key, value);

    return {
      _ok: true,
      _result: value
    };
  }
}

test("XCommandRuntime resolves legacy command parameters", () => {
  _xd.clean();
  _xd.set("settings", { theme: "dark" }, { source: "test" });

  const payload = {
    kind: "click",
    user: {
      name: "Tamir"
    }
  };

  const resolved = XCommandRuntime.resolveParams(
    {
      data: "$data",
      data_path: "$data.user.name",
      event: "$event",
      event_path: "$event.kind",
      prev: "$prev",
      prev_path: "$prev._result.value",
      row: "$row",
      row_path: "$row.id",
      xdata_dot: "$xdata.settings.theme",
      xdata_colon: "$xdata:settings.theme",
      nested: {
        list: ["$data.user.name", "$row.detail.value"]
      }
    },
    {
      _data: payload,
      _event: payload,
      _prev: {
        _result: {
          value: 42
        }
      },
      _context: {
        row: {
          id: "row-1",
          detail: {
            value: "row-value"
          }
        }
      }
    }
  );

  assert.equal(resolved.data, payload);
  assert.equal(resolved.data_path, "Tamir");
  assert.equal(resolved.event, payload);
  assert.equal(resolved.event_path, "click");
  assert.deepEqual(resolved.prev, { _result: { value: 42 } });
  assert.equal(resolved.prev_path, 42);
  assert.deepEqual(resolved.row, {
    id: "row-1",
    detail: {
      value: "row-value"
    }
  });
  assert.equal(resolved.row_path, "row-1");
  assert.equal(resolved.xdata_dot, "dark");
  assert.equal(resolved.xdata_colon, "dark");
  assert.deepEqual(resolved.nested.list, ["Tamir", "row-value"]);
});

test("XCommandRuntime resolves flat dotted XData keys", () => {
  _xd.clean();
  _xd.set("settings.theme", "dark", { source: "test" });

  const resolved = XCommandRuntime.resolveParams({
    dot: "$xdata.settings.theme",
    colon: "$xdata:settings.theme"
  });

  assert.equal(resolved.dot, "dark");
  assert.equal(resolved.colon, "dark");
});

test("XCommandRuntime resolves nested values under dotted XData keys", () => {
  _xd.clean();
  _xd.set("ai.connection", { _provider: "aime" }, { source: "test" });

  const resolved = XCommandRuntime.resolveParams({
    dot: "$xdata.ai.connection._provider",
    colon: "$xdata:ai.connection._provider"
  });

  assert.equal(resolved.dot, "aime");
  assert.equal(resolved.colon, "aime");
});

test("XObject handler resolution keeps $data, $event, $prev, and $row behavior", async () => {
  const captures = [];
  const obj = new XObject({ _id: "legacy-object" });

  obj._context = {
    row: {
      id: "row-2"
    }
  };

  obj.addNanoCommand("capture", (xcmd) => {
    captures.push(xcmd._params);
    return {
      _ok: true,
      _result: {
        mark: xcmd._params?.mark
      }
    };
  });

  const payload = {
    type: "submit",
    value: "payload-value"
  };

  await obj.checkAndRunInternalFunction(
    {
      _commands: [
        {
          _op: "capture",
          _params: {
            mark: "first",
            data: "$data.value",
            event: "$event.type",
            row: "$row.id"
          }
        },
        {
          _op: "capture",
          _params: {
            mark: "$prev._result.mark"
          }
        }
      ],
      _mode: "chain"
    },
    payload
  );

  assert.deepEqual(captures, [
    {
      mark: "first",
      data: "payload-value",
      event: "submit",
      row: "row-2",
      _event: payload
    },
    {
      mark: "first",
      data: payload,
      _event: payload
    }
  ]);
});

test("XObject aggregate XData write stores primitive from actual command wrapper", async () => {
  _xd.clean();

  class AggregateModule extends XModule {
    constructor() {
      super({ _name: "entity-manager" });
    }

    _aggregate() {
      return {
        _ok: true,
        _ts: Date.now(),
        _pt: 0,
        _result: {
          _aggregation: {
            _op: "sum",
            _field: "calories",
            _value: 0
          },
          _value: 0
        }
      };
    }
  }

  const engine = new XpellEngine();
  await engine.loadModuleAsync(new AggregateModule());
  await engine.loadModuleAsync(new XDataModule());

  const obj = new XObject({
    _id: "aggregate-wrapper-object",
    _on_mount: {
      _mode: "chain",
      _stop_on_error: true,
      _commands: [
        {
          _module: "entity-manager",
          _op: "aggregate",
          _params: {}
        },
        {
          _module: "xd",
          _op: "set",
          _params: {
            key: "meal:sum:calories",
            value: "$prev",
            source: "entity-aggregation:on-mount"
          }
        }
      ]
    }
  });

  await obj.onMount();

  assert.equal(_xd.get("meal:sum:calories"), 0);
  assert.equal(typeof _xd.get("meal:sum:calories"), "number");
});

test("XObject applies _output to XData and preserves command return value", async () => {
  _xd.clean();

  const obj = new XObject({ _id: "output-object" });
  const commandResult = {
    _ok: true,
    _result: {
      _theme: "midnight"
    }
  };

  obj.addNanoCommand("get-theme", () => commandResult);

  const returned = await obj.execute({
    _op: "get-theme",
    _params: {},
    _output: {
      _target: "xdata",
      _key: "settings.theme",
      _path: "_result._theme"
    }
  });

  assert.equal(returned, commandResult);
  assert.equal(_xd.get("settings.theme"), "midnight");
});

test("XpellEngine applies _output for module commands without changing module return value", async () => {
  _xd.clean();
  const commandResult = {
    _ok: true,
    _result: {
      _theme: "module-theme"
    }
  };

  class SettingsModule extends XModule {
    constructor() {
      super({ _name: "settings" });
    }

    _read() {
      return commandResult;
    }
  }

  const engine = new XpellEngine();
  const mod = new SettingsModule();
  await engine.loadModuleAsync(mod);

  const returned = await engine.execute({
    _module: "settings",
    _op: "read",
    _params: {},
    _output: {
      _target: "xdata",
      _key: "settings.theme",
      _path: "_result._theme"
    }
  });

  assert.equal(returned, commandResult);
  assert.equal(_xd.get("settings.theme"), "module-theme");
});

test("XpellEngine ready helpers write and read system readiness state", () => {
  _xd.clean();

  const engine = new XpellEngine();

  engine.ready("wormhole");
  assert.equal(_xd.get("system.ready.wormhole"), true);
  assert.equal(engine.isReady("wormhole"), true);

  engine.notReady("wormhole");
  assert.equal(_xd.get("system.ready.wormhole"), false);
  assert.equal(engine.isReady("wormhole"), false);
});

test("XpellEngine ready helpers keep full readiness paths unchanged", () => {
  _xd.clean();

  const engine = new XpellEngine();

  engine.ready("system.ready.wormhole");
  assert.equal(_xd.get("system.ready.wormhole"), true);
  assert.equal(_xd.has("system.ready.system.ready.wormhole"), false);
  assert.equal(engine.isReady("system.ready.wormhole"), true);

  engine.ready("system.ready.wormhole", false);
  assert.equal(_xd.get("system.ready.wormhole"), false);
  assert.equal(engine.isReady("system.ready.wormhole"), false);
});

test("XModule.execute does not route _output directly", async () => {
  _xd.clean();
  const commandResult = {
    _ok: true,
    _result: {
      _theme: "direct-module-theme"
    }
  };

  class SettingsModule extends XModule {
    constructor() {
      super({ _name: "settings-direct" });
    }

    _read() {
      return commandResult;
    }
  }

  const mod = new SettingsModule();
  const returned = await mod.execute({
    _module: "settings-direct",
    _op: "read",
    _params: {},
    _output: {
      _target: "xdata",
      _key: "settings.theme",
      _path: "_result._theme"
    }
  });

  assert.equal(returned, commandResult);
  assert.equal(_xd.has("settings.theme"), false);
});

test("commands without _output keep behavior unchanged", async () => {
  _xd.clean();

  const obj = new XObject({ _id: "no-output-object" });
  const commandResult = {
    _ok: true,
    _result: "unchanged"
  };

  obj.addNanoCommand("same", () => commandResult);

  const returned = await obj.execute({
    _op: "same",
    _params: {}
  });

  assert.equal(returned, commandResult);
  assert.equal(_xd.has("settings.theme"), false);
});

test("XObject without _requires runs _on_mount normally once", async () => {
  _xd.clean();
  let mounts = 0;

  const obj = new XObject({
    _id: "mount-without-requires",
    _on_mount: () => {
      mounts += 1;
    }
  });

  await obj.onMount();
  await obj.onMount();

  assert.equal(mounts, 1);
});

test("XObject with _requires already true runs _on_mount immediately", async () => {
  _xd.clean();
  _xd.set("system.ready.wormhole", true, { source: "test" });

  let mounts = 0;
  const obj = new XObject({
    _id: "mount-requires-ready",
    _requires: "system.ready.wormhole",
    _on_mount: () => {
      mounts += 1;
    }
  });

  await obj.onMount();

  assert.equal(mounts, 1);
});

test("XObject with _requires false or missing waits until ready", async () => {
  _xd.clean();
  _xd.set("system.ready.wormhole", false, { source: "test" });

  let mounts = 0;
  const obj = new XObject({
    _id: "mount-requires-waits",
    _requires: "system.ready.wormhole",
    _on_mount: () => {
      mounts += 1;
    }
  });

  const mounted = obj.onMount();
  await tick();

  assert.equal(mounts, 0);

  _xd.set("system.ready.wormhole", true, { source: "test" });
  await mounted;

  assert.equal(mounts, 1);
});

test("XObject _requires waits for multiple readiness keys", async () => {
  _xd.clean();
  _xd.set("system.ready.wormhole", true, { source: "test" });

  let mounts = 0;
  const obj = new XObject({
    _id: "mount-requires-multiple",
    _requires: ["system.ready.wormhole", "auth.logged_in"],
    _on_mount: () => {
      mounts += 1;
    }
  });

  const mounted = obj.onMount();
  await tick();

  assert.equal(mounts, 0);

  _xd.set("auth.logged_in", true, { source: "test" });
  await mounted;

  assert.equal(mounts, 1);
});

test("XObject gated _on_mount does not run twice after readiness changes again", async () => {
  _xd.clean();

  let mounts = 0;
  const obj = new XObject({
    _id: "mount-requires-once",
    _requires: "system.ready.wormhole",
    _on_mount: () => {
      mounts += 1;
    }
  });

  const mounted = obj.onMount();
  _xd.set("system.ready.wormhole", true, { source: "test" });
  await mounted;

  _xd.set("system.ready.wormhole", false, { source: "test" });
  _xd.set("system.ready.wormhole", true, { source: "test" });
  await tick();

  assert.equal(mounts, 1);
});

test("XObject _requires can read nested readiness from XData path", async () => {
  _xd.clean();
  _xd.set("system", { ready: { wormhole: true } }, { source: "test" });

  let mounts = 0;
  const obj = new XObject({
    _id: "mount-requires-nested-path",
    _requires: "system.ready.wormhole",
    _on_mount: () => {
      mounts += 1;
    }
  });

  await obj.onMount();

  assert.equal(mounts, 1);
});

test("XObject _data_source and _on_data behavior still works with readiness support", async () => {
  _xd.clean();

  const received = [];
  const obj = new XObject({
    _id: "data-source-existing-behavior",
    _data_source: "settings.loaded",
    _on_data: (_object, data) => {
      received.push(data);
    }
  });

  _xd.set("settings.loaded", "initial", { source: "test" });
  await obj.onMount();
  await tick();

  _xd.set("settings.loaded", "next", { source: "test" });
  await tick();

  assert.deepEqual(received, ["initial", "next"]);

  await obj.dispose();
});

test("XObject _persist restores xdb-client get-string _result.value", async () => {
  _xd.clean();

  const engine = new XpellEngine();
  const xdb = new MockXdbClientModule({
    "settings.theme": "dark"
  });
  await engine.loadModuleAsync(xdb);

  const obj = new XObject({
    _id: "persist-restore",
    _persist: {
      _store: "xdb-client",
      _key: "settings.theme",
      _default: "terminal"
    }
  });

  await obj.onMount();
  await tick();

  assert.deepEqual(xdb.gets, ["settings.theme"]);
  assert.equal(_xd.get("settings.theme"), "dark");
  assert.equal(obj._value, "dark");

  await obj.dispose();
});

test("XObject _persist saves event target string values", async () => {
  _xd.clean();

  const engine = new XpellEngine();
  const xdb = new MockXdbClientModule({
    "settings.theme": "dark"
  });
  await engine.loadModuleAsync(xdb);

  const obj = new XObject({
    _id: "persist-save-event",
    _persist: "settings.theme"
  });

  await obj.onMount();
  await tick();
  await obj.onChange({
    target: {
      value: "light"
    }
  });

  assert.deepEqual(xdb.saves, [
    {
      key: "settings.theme",
      value: "light"
    }
  ]);
  assert.equal(xdb.values.get("settings.theme"), "light");

  await obj.dispose();
});

test("XObject _persist composes with authored _on.change", async () => {
  _xd.clean();
  setXEventManager(new _XEventManager());

  const engine = new XpellEngine();
  const xdb = new MockXdbClientModule({
    "settings.theme": "dark"
  });
  await engine.loadModuleAsync(xdb);

  const calls = [];
  const obj = new XObject({
    _id: "persist-on-change-map",
    _persist: {
      _store: "xdb-client",
      _key: "settings.theme",
      _default: "terminal"
    },
    _on: {
      change: (_object, data) => {
        calls.push(`change:${data?.target?.value}`);
      }
    }
  });

  await obj.onMount();
  await tick();
  await obj.onChange({
    target: {
      value: "light"
    }
  });

  assert.deepEqual(calls, ["change:light"]);
  assert.deepEqual(xdb.saves, [
    {
      key: "settings.theme",
      value: "light"
    }
  ]);

  await obj.dispose();
});

test("XObject _persist composes with authored _on_change", async () => {
  _xd.clean();

  const engine = new XpellEngine();
  const xdb = new MockXdbClientModule({
    "settings.theme": "dark"
  });
  await engine.loadModuleAsync(xdb);

  const calls = [];
  const obj = new XObject({
    _id: "persist-on-change-field",
    _persist: "settings.theme",
    _on_change: (_object, data) => {
      calls.push(`change:${data.value}`);
    }
  });

  await obj.onMount();
  await tick();
  await obj.onChange({
    value: "light"
  });

  assert.deepEqual(calls, ["change:light"]);
  assert.deepEqual(xdb.saves, [
    {
      key: "settings.theme",
      value: "light"
    }
  ]);

  await obj.dispose();
});

test("XObject without _persist keeps existing _on_change branch semantics", async () => {
  const calls = [];
  const obj = new XObject({
    _id: "no-persist-change-semantics",
    _on_change: () => {
      calls.push("_on_change");
    },
    _on: {
      change: () => {
        calls.push("_on.change");
      }
    }
  });

  await obj.onChange("value");

  assert.deepEqual(calls, ["_on_change"]);
});

test("XObject _persist default is used only when no stored value exists", async () => {
  _xd.clean();

  const engine = new XpellEngine();
  const xdb = new MockXdbClientModule({
    "settings.theme": "dark"
  });
  await engine.loadModuleAsync(xdb);

  const restored = new XObject({
    _id: "persist-default-stored",
    _persist: {
      _store: "xdb-client",
      _key: "settings.theme",
      _default: "terminal"
    }
  });

  await restored.onMount();
  await tick();

  assert.equal(restored._value, "dark");
  assert.equal(_xd.get("settings.theme"), "dark");

  await restored.dispose();
  _xd.clean();
  xdb.values.delete("settings.theme");

  const fallback = new XObject({
    _id: "persist-default-missing",
    _persist: {
      _store: "xdb-client",
      _key: "settings.theme",
      _default: "terminal"
    }
  });

  await fallback.onMount();
  await tick();

  assert.equal(fallback._value, "terminal");
  assert.equal(_xd.get("settings.theme"), "terminal");
  assert.deepEqual(xdb.saves, []);

  await fallback.dispose();
});

test("XObject _persist does not duplicate authored _on_data on restore", async () => {
  _xd.clean();

  const engine = new XpellEngine();
  const xdb = new MockXdbClientModule({
    "settings.theme": "dark"
  });
  await engine.loadModuleAsync(xdb);

  const received = [];
  const obj = new XObject({
    _id: "persist-no-duplicate-data",
    _persist: "settings.theme",
    _on_data: (_object, data) => {
      received.push(data);
    }
  });

  await obj.onMount();
  await tick();

  assert.deepEqual(received, ["dark"]);
  assert.equal(obj._value, "dark");

  await obj.dispose();
});

test("XObject _persist keeps generated lifecycle internals out of XData export", () => {
  _xd.clean();

  const obj = new XObject({
    _id: "persist-export",
    _persist: "settings.theme"
  });

  const exported = obj.toXData();

  assert.equal(exported._persist, "settings.theme");
  assert.equal(Object.hasOwn(exported, "_data_source"), false);
  assert.equal(Object.hasOwn(exported, "_on_mount"), false);
  assert.equal(Object.hasOwn(exported, "_on_data"), false);
  assert.equal(Object.hasOwn(exported, "_on_change"), false);
});
