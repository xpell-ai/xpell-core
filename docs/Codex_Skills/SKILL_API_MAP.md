# @xpell/core Skill API Map

## 1) package.json exports map

Verbatim export keys:
- `"."`
- `"./package.json"`

Resolved values summary:
- `"."`:
- `types`: `./dist/index.d.ts`
- `import`: `./dist/xpell-core.es.js`
- `require`: `./dist/xpell-core.cjs.js`
- `"./package.json"` -> `./package.json`

Related package entry fields:
- `main`: `./dist/xpell-core.cjs.js`
- `module`: `./dist/xpell-core.es.js`
- `types`: `./dist/index.d.ts`

## 2) Entrypoints and what they export

### `src/index.ts`
- `export * from "./Xpell"`
- `export { default } from "./Xpell"`

### `src/Xpell.ts` (public surface re-exported by package root)
Engine:
- `XpellEngine`
- `Xpell` (singleton), `_x` alias
- `XD_FRAME_NUMBER`, `XD_FPS`

State:
- `XData`, `_xd`, `_XData`
- `type XDataStore`

Events:
- `XEventManager`, `_xem`, `_XEventManager`
- `type XEventListener`
- `type XEventListenerOptions`

Modules/objects:
- `XModule` + `type XModuleData`
- `XObject`, `XObjectPack`
- `XObjectManager`
- `type XObjectData`
- `type XObjectOnEventIndex`
- `type XObjectOnEventHandler`
- `type XDataXporter`
- `type XDataXporterHandler`
- `type IXData`
- `type XValue`

Commands/parsing:
- `XParser`
- `XCommand` + `type XCommandData`
- `type XNanoCommandPack`
- `type XNanoCommand`
- `XParams`

Utilities/runtime helpers:
- `XUtils`, `_xu`, `_XUtils`
- `type XFrameScheduler`
- `XLogger`, `_xlog`, `_XLogger`

Protocol/errors:
- `XError` + `type XErrorOptions` + `type XErrorLevel` + `type XErrorMeta`
- `XResponse`, `XResponseOK`, `XResponseError`
- `type XResponseData`

## 3) Main folders/subsystems

`src/Xpell.ts`
- Engine singleton and frame loop, module loading, top-level command dispatch.

`src/XData.ts`
- XData2 shared runtime memory, change events, legacy `_o` compatibility proxy.

`src/XNanoCommands.ts`
- Built-in object nano-commands (`info`, `log`, `fire`, `noop`, field mutators, `run-seq`).

`src/XEventManager.ts`
- Process-wide event bus with listener ids, owner cleanup, one-time listeners.

`src/XModule.ts`
- Base module extension point, object registry ownership, op dispatch mapping.

`src/XObject.ts`
- Base runtime object with lifecycle hooks, event wiring, data-source binding, nano-command execution, JSON export.

`src/XObjectManager.ts`
- Registry for object classes and live module-owned objects.

`src/XParser.ts` + `src/XCommand.ts`
- Text/object command parsing and canonical command shape.

`src/XProtocol.ts` + `src/XError.ts`
- Response envelope and structured error model.

`src/XUtils.ts`, `src/XLogger.ts`, `src/XParams.ts`, `src/XConst.ts`
- Runtime utilities, logging, parameter helpers, shared node constants.

## 4) Hot classes/singletons for maintainers

Hot singletons:
- `_x` / `Xpell` -> global engine instance
- `_xd` / `XData` -> global runtime state store
- `_xem` / `XEventManager` -> global event bus
- `_xlog` / `XLogger` -> logging facade
- `_xu` / `XUtils` -> utility singleton

Hot base classes:
- `XModule` -> extension boundary for module behavior
- `XObject` -> base runtime object (no UI assumptions)
- `XObjectManager` -> module object/class registry
- `XCommand` -> normalized command envelope
- `_XData`, `_XEventManager`, `_XLogger`, `_XUtils` -> class-level implementations behind singletons

## 5) Maintainer notes (code-vs-doc reality)

- `docs/nano-commands2.md` states “no run-seq nano command”, but `src/XNanoCommands.ts` currently implements `"run-seq"`.
- Data-only handlers are documented as required for persisted views, but `XObject` still accepts function handlers (runtime/dev use).
