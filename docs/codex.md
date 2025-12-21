# XPELL-CORE CODEX

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

## XData Contract

- XData is shared runtime memory.
- Access ONLY via:
  - `XData._o[...]` or `_xd._o[...]`
- XData is not persistence.
- Keys must be explicit and documented.
- No deprecated or mirrored APIs are allowed.

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
