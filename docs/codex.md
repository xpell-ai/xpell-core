# XPELL-CORE codex.md rules for ai agent for vibe coding with xpell-core

## Purpose
This document defines the strict contract for **xpell-core** — the runtime engine and interpreter that powers all Xpell systems.

---

## Core Responsibilities
xpell-core provides:
- Engine loop
- Event system
- Command system
- Data layer (XData)
- Object lifecycle (XObject)
- Module loading (XModule)

xpell-core does **NOT** provide UI rendering.

---

## Runtime Object Model

- `XObject` is the foundational runtime object.
- XObject is **UI-agnostic** and MUST NOT include or assume:
  - DOM access
  - visibility logic
  - UI methods (`show`, `hide`, etc.)

UI behavior is added only by higher-level layers (e.g. `XUIObject`).

---
## XData Contract (XData2)

- XData is shared runtime memory (process-wide), used for explicit state sharing and signaling.
- XData is NOT persistence.
- Keys must be explicit, stable, and documented at their point of use.
- No module may mirror XData into hidden local mutable state as a “shadow source of truth”.

### Canonical API (required)
All new code MUST use the XData2 API:

- Read: `XData.get(key)` / `_xd.get(key)`
- Write: `XData.set(key, value, { source })` / `_xd.set(...)`
- Delete: `XData.delete(key, { source })` / `_xd.delete(...)`
- Subscribe: `XData.on(key, cb)` / `_xd.on(...)`
- Notify without changing value (optional): `XData.touch(key, { source })`
- Mailbox semantics (optional): `XData.pick(key, { source })`

### Compatibility API (legacy)
- Direct object access via `_o` is LEGACY compatibility only:
  - `XData._o[key] = value`
  - `_xd._o[key] = value`
- `_o` access MAY exist only to support old code and migration.
- New code MUST NOT write via `_o`.
- Core may optionally:
  - warn in dev on legacy writes (`_warn_legacy_writes`)
  - route legacy writes through `.set()` (`_compat_writes`)
- Whether `_o` triggers notifications is a configuration detail of XData2, not a contract.

### Required metadata
- Every `.set()` and `.delete()` in core/runtime code MUST include a `source` string.
  - Example: `{ source: "xvm:navigate" }`
- `source` must be stable and human-readable for debugging.

### Rules
- Do not assume ordering of listeners.
- Avoid high-frequency writes unless necessary (frame loop keys should be intentional).
- Do not use XData as an event bus; use XEventManager (`_xem`) for events.

---

## Naming Convention — Runtime State

- All runtime-managed object members MUST:
  - start with `_`
  - use `snake_case`

- Method names MAY use `camelCase`.

This defines the boundary between runtime state and implementation logic.

---

## Method Exposure & Command Mapping

### Method Visibility
- Methods starting with `_` are **public to the Xpell engine**.
- Such methods may be invoked via `run / execute`.
- Methods without `_` are internal-only.

This replaces legacy descriptor-based exposure.

### Command Name Mapping
- Leading `_` is removed when invoked.
- `_` and `-` are interchangeable.
- No other transformations are allowed.

Example:
```ts
public _my_x_method(cmd) { ... }
```

Callable as:
```txt
my_x_method
my-x-method
```

---

## Parser Responsibilities

- `XParser.parse()` → module-level commands only.
- Object / nano-command parsing is internal and separate.
- Parsers must not infer or substitute for one another.
- Parsing never executes commands or mutates state.

---

## Platform Rules

- xpell-core is platform-agnostic by design.
- Platform-specific logic must be isolated.
- Core must not assume DOM, UI, or filesystem access.

---

## Forbidden Patterns ❌
- UI logic in core
- Implicit globals
- Hidden mutable state
- Framework-style lifecycles
- API inference or auto-magic

---

## One-Line Anchor
**xpell-core is a real-time interpreter engine that provides execution, data, and events for Xpell systems.**
