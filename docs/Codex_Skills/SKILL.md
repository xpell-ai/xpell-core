---
name: Xpell Core Contract
id: xpell-core
version: 1.0.0
updated: 2026-02-26
description: Foundational runtime contract for @xpell/core: deterministic interpreter, XData2 shared state, Nano-Commands v2, XEM event bus, and module/object base classes. Enforces data-first AI-native execution.
requires: 
  - xpell-contract
---

## 1) Applies to / Scope
- Package: `@xpell/core` in this repository.
- Source of truth scanned: `package.json`, all `src/*.ts`, `README.md`, `docs/Codex.md`, `docs/XData 2.md`, `docs/nano-commands2.md`, `docs/architecture/overview.md`, and built type entry (`dist/index.d.ts`).
- This contract governs code that depends on core directly, and integration layers built on top (`@xpell/ui`, `@xpell/node`, `@xpell/3d`, app repos).

## 2) Core identity (what it is / isn’t)
What it is:
- A runtime/interpreter core with:
- engine loop + scheduler (`XpellEngine.onFrame`, `start`)
- command dispatch (`run`, `execute`)
- shared runtime state (`XData` / `_xd`)
- event bus (`XEventManager` / `_xem`)
- base extension/object model (`XModule`, `XObject`, `XObjectManager`)

What it is not:
- Not a UI renderer or DOM layer.
- Not a persistence/database layer.
- Not an app/business framework.
- Not a hidden-state runtime; contracts are explicit.

Code reality caveat:
- `XParser.xmlString2Xpell()` uses `DOMParser`; this helper requires an environment that provides it.

## 3) Public API map (high level; details in SKILL_API_MAP.md)
- Package export surface is a single public subpath: `"."` (plus `"./package.json"`).
- Public entrypoint re-exports from `src/Xpell.ts` via `src/index.ts`.
- High-level API groups:
- Engine/runtime singleton: `Xpell`, `_x`, `XpellEngine`
- State: `XData`, `_xd`, `_XData`
- Events: `XEventManager`, `_xem`, `_XEventManager`
- Modules/objects: `XModule`, `XObject`, `XObjectManager`, `XObjectPack`
- Commands/parsing: `XCommand`, `XParser`, nano-command types
- Utility/protocol/error: `XUtils`, `XParams`, `XResponse*`, `XError`, `XLogger`
- Integration expectations by layer:
- `@xpell/ui`: implements UI-specific objects/ops on top of core (`XObject` stays UI-agnostic in core).
- `@xpell/3d`: implements 3D/spatial behavior on top of core lifecycle, events, and commands.
- `@xpell/node`: uses core runtime contracts (commands/events/XData/protocol) without DOM assumptions.
- App repos: should depend on higher layers (`@xpell/ui`, `@xpell/node`, `@xpell/3d`) unless extending engine internals directly.
- Detailed package-specific operation allowlists for `@xpell/ui`, `@xpell/3d`, and `@xpell/node` are `unknown` in this repo (not defined under `@xpell/core` source).

## 4) Runtime invariants (single source of truth, execute path, state, events)
- Single source of truth:
- Engine module registry inside `_x` (`_modules`) is authoritative for module command routing.
- Runtime shared data keys live in `XData`; object-level behavior lives on `XObject` instances.
- Execute path:
- `_x.run("...")` -> `XParser.parse(...)` -> `_x.execute(xcmd)`.
- `_x.execute(xcmd)` requires `xcmd._module` and a loaded module; otherwise throws.
- `XModule.execute(xcmd)`:
- if `xcmd._object` exists: dispatches to that object’s `XObject.execute(...)`.
- else maps op to module method: `"_"+_op.replaceAll("-", "_")`; missing op throws.
- `XObject.execute(xcmd)` resolves `_op` in object’s `_nano_commands`; missing op logs error.
- Loop/state:
- Engine increments frame, calls each module `onFrame`, then writes:
- `engine:frame-number`
- `engine:fps`
- legacy keys `frame-number` / `fps` only when `_compat_legacy_keys` is true.
- Events:
- Event coordination uses `_xem` (`on`, `once`, `fire`, `remove`, `removeOwner`).
- `XObject` event handlers are parsed once on mount and cleaned on dispose.
- Serialization:
- `XObject.toXData()` drops function fields.
- `XResponse.toXData()` returns transport-safe response envelope.

## 5) XData2 contract (keys, mutation rules, no hidden mirrors)
- Canonical API: `get`, `set`, `patch`, `touch`, `has`, `delete`, `pick`, `on`, `off`, `onAny`, `clean`.
- Mutations emit `XDataChange` with `{ key, value, prev, ts, op, meta }`.
- `_o` exists for compatibility and can proxy writes/deletes to canonical methods when `_compat_writes=true`.
- Listener order should not be relied on by consumers.
- Keys should be explicit and stable (contract/documentation requirement).
- Hidden mirrored mutable state is forbidden by contract (`docs/Codex.md`), not automatically enforced by runtime code.
- `source` metadata on writes/deletes is required by contract docs, but enforcement is partial: code accepts missing `meta` (`unknown` enforcement completeness).

## 6) Nano-Commands v2 contract (data-only, JSON form, sequences if present)
- Handler forms supported by `XObject` runtime:
- function (dev/runtime-authored)
- string nano-command
- JSON command object with `_op` (and optional `_params`)
- arrays/sequences of handlers (executed in order, awaited)
- JSON handler target rules in `XObject.checkAndRunInternalFunction`:
- `_object` may be omitted, `"this"`, or the current object id.
- non-self targets are rejected (logged, not executed).
- Built-in nano commands in core pack include:
- `info`, `log`, `fire`, `noop`, `set-field`, `delete-field`, `toggle-field`, `merge`, `run-seq`
- `run-seq` exists in code and enforces self-targeted steps only.
- Contract mismatch to note:
- `docs/nano-commands2.md` says “no run-seq nano command”; source code currently implements `"run-seq"`.
- Data-only requirement for DB-stored views is documented, but runtime does not globally block function handlers (`unknown` global validation boundary).

## 7) XEM contract (events are not a state store; payload explicit; ordering not assumed)
- API: `on`, `once`, `fire`, `remove`, `removeOwner`, `clear`.
- Events are coordination only; state belongs in `XData`.
- Payload is explicit (`fire(event_name, data)`).
- Listener order should not be assumed by consumers. Current implementation iterates a snapshot in registration order.
- Listener exceptions are caught and logged; dispatch continues.

## 8) XModule contract (only extension point; naming; ops; cross-module boundaries)
- `XModule` is the base extension point for behavior.
- Module identity uses `_name` and `_id`.
- Command exposure is underscore-prefixed methods:
- command `"my-op"` maps to method `"_my_op"`.
- Objects are created/owned through module’s `XObjectManager`.
- Object-targeted commands require explicit `_object` id.
- No fallback object-name command resolution in `execute` (explicitness over ambiguity).
- Cross-module behavior should go through engine dispatch/events/XData contracts; direct hidden mutation across modules is an anti-pattern.

## 9) XObject contract (no UI assumptions; lifecycle; no platform coupling)
- `XObject` is the base runtime node, not a UI object.
- Lifecycle hooks:
- `onCreate`
- `onMount` (parses events, binds `_data_source`)
- `onData`
- `onFrame`
- `dispose` (unbind data, remove listeners, clear refs, dispose children)
- Data-source binding is subscription-based (`_xd.on`), not frame polling.
- Exports are JSON-first via `toXData`; functions are omitted.
- `XObject` itself is UI-agnostic; UI methods belong to higher layers (`@xpell/ui`).

## 10) Hard forbiddens (explicit bullets)
- Do not add UI behavior (DOM/show/hide/layout/CSS assumptions) to `@xpell/core` base classes.
- Do not use `XData` as an event bus; use `_xem`.
- Do not rely on hidden mirrors of `XData` as shadow state.
- Do not write new code via `XData._o[...]` when canonical methods are available.
- Do not assume listener ordering semantics.
- Do not use `eval`, `new Function`, or executable code inside persisted command payloads.
- Do not perform implicit cross-object targeting in JSON handlers; keep handlers local unless explicitly supported by runtime boundary.
- Do not couple core to Node FS/DOM-only APIs in base runtime contracts.

## 11) Error + logging contract (structured errors, no secret logs)
- Structured error type: `XError` with `_code`, `_level`, `_meta`, `_cause`, `message`.
- Protocol envelope: `XResponse` / `XResponseOK` / `XResponseError` with `_ok`, `_ts`, `_pt`, `_result`.
- Unknown errors are normalized to `XError("E_INTERNAL", ...)` in `XResponse.error`.
- Logging:
- `XLogger` singleton is configurable.
- `_xlog` is `console` in dev and `XLogger` in production.
- Secret redaction is not built into logger (`unknown` automated redaction policy). Treat sensitive data logging as forbidden at usage level.

## 12) Minimal examples (2–3 short snippets, proven by repo patterns)
```ts
import { _x, XModule } from "@xpell/core";

class DemoModule extends XModule {
  constructor() { super({ _name: "demo" }); }
  _ping(cmd: any) { return cmd?._params?.msg ?? "pong"; }
}

_x.loadModule(new DemoModule());
const out = await _x.execute({ _module: "demo", _op: "ping", _params: { msg: "hi" } });
```

```ts
import { _xd } from "@xpell/core";

const off = _xd.on("engine:fps", (ch) => {
  console.log("fps:", ch.value);
});

_xd.set("engine:fps", 60, { source: "example:fps" });
off();
```

```ts
import { XObject } from "@xpell/core";

const obj = new XObject({
  _id: "obj-1",
  _on_data: [
    { _op: "log" },
    { _op: "set-field", _params: { name: "_name", value: "updated" } }
  ]
});

await obj.onMount();
await obj.onData({ value: 1 });
```
