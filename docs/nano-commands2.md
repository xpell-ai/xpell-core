# Nano-Commands v2 (JSON + Sequences) — Xpell 2 Contract

This document is the **canonical contract** for how Xpell 2 executes *nano-commands* from:
- **DB-stored views**
- **agent edits**
- **schema-generated UI**
- **runtime events** (`_on_click`, `_on_data`, `_on_show`, …)

Goal: **data-only intent** instead of JS functions, while keeping execution **small, deterministic, and auditable**.

---

## Why this matters

Historically, handlers were either:
- **Functions** (powerful, but not serializable / not DB-safe)
- **String nano-commands** (simple, but awkward for complex parameters)

Xpell 2 upgrades handlers with two capabilities:

1) **JSON Command Handlers** — structured `XCommandData` (pure data)  
2) **Sequence Handlers** — arrays of handlers executed **in order** (awaited)

This enables **dynamic views** stored in XDB/files and real-time “vibe coding” without embedding code.

---

## Handler formats (what you can put in object JSON)

A “handler” field (e.g. `_on_click`, `_on_show`, `_on_hide`, `_on_data`, `_on_mount`, `_on_frame`) can be:

### A) Function (dev-only)
Use only in developer-authored object packs.

```ts
_on_click: async (obj, e) => {
  // custom code (NOT DB-safe)
}
```

### B) String nano-command (legacy / shorthand)
For simple actions.

```json
"_on_click": "hide"
```

### C) JSON command (canonical)
For DB-stored, agent-editable views.

```json
"_on_click": { "_op": "hide" }
```

Or with parameters:

```json
"_on_click": { "_op": "set-text", "_params": { "text": "ok" } }
```

### D) Sequence (canonical composition)
Multi-step flows as data (no scripting language).

```json
"_on_click": [
  { "_op": "hide" },
  { "_op": "set-text", "_params": { "text": "Hidden" } },
  { "_op": "show" }
]
```

**Sequence semantics:**
- Execute **in order**
- Each item is **awaited**
- Default: **abort on thrown error** (consistent with your runtime error logging)

> If you need shared state between steps, use **XData** keys (recommended).

---

## JSON command format (XCommandData)

A JSON command is the canonical runtime intent shape:

```json
{
  "_op": "set-text",
  "_params": { "text": "hello" }
}
```

Optional fields (tooling + future evolution):

```json
{
  "_module": "xui",
  "_object": "this",
  "_op": "hide",
  "_params": {}
}
```

### Important runtime note (today)
In current Xpell 2 runtime, command resolution is **object-local**:
- `XObject.execute()` resolves `_op` against nano-command packs registered on the **target object**
- `_module` is treated as **semantic metadata** (helpful for tools/agents), not required for execution

### `_object` target rule
- If `_object` is omitted or `"this"`, the target is the **current object** (recommended for DB-stored handlers)
- Cross-object targeting may be constrained by policy; keep DB handlers **local by default**

---

## Payload injection (passing data/events into JSON handlers)

When a handler is invoked with a payload (e.g. `onData(data)` or click event `e`), the runtime may inject:

- `cmd._params.data = payload` **only if** `data` is not already provided.

This enables structured value passing without JSON-in-string escaping.

Example:

```json
"_on_data": { "_op": "set-text-from-data", "_params": { "pattern": "FPS: $data" } }
```

---

## Examples

### 1) XUIObject — simple click hide (string)
```json
{
  "_id": "btn-close",
  "_type": "button",
  "_text": "Close",
  "_on_click": "hide"
}
```

### 2) XUIObject — set text on click (JSON)
```json
{
  "_id": "btn-ok",
  "_type": "button",
  "_text": "OK",
  "_on_click": { "_op": "set-text", "_params": { "text": "ok" } }
}
```

### 3) XUIObject — hide then show (sequence)
```json
{
  "_id": "panel",
  "_type": "view",
  "_on_click": [
    { "_op": "hide" },
    { "_op": "show" }
  ]
}
```

### 4) XObject — onData drives UI (sequence)
```json
{
  "_id": "fps-label",
  "_type": "label",
  "_data_source": "engine:fps",
  "_on_data": [
    { "_op": "set-text-from-data", "_params": { "pattern": "FPS: $data" } }
  ]
}
```

---

## Design rule: no `run-seq` nano command

Xpell 2 **does not** introduce a `run-seq` nano command.

Sequencing is structural at the handler level:
- handlers may be arrays
- each item is executed in order

This keeps nano-commands:
- **atomic**
- **auditable**
- **non-scriptable**

---

## Security notes

This upgrade is explicitly designed to avoid “code in DB”:

- ✅ JSON commands are **whitelisted ops** (`_op` on a known nano-command pack)
- ✅ parameters are **data**, not executable code
- ✅ runtime can enforce:
  - allowed ops
  - allowed targets
  - capability checks
  - rate limits
- ❌ avoid `eval` / `new Function` / code-in-JSON

**Rule:** if a view is stored in DB and editable by an agent, handlers must be **data-only** (no functions).

---

## Recommended next steps (implementation checklist)

1) Ensure `checkAndRunInternalFunction()` supports:
   - `XCommandData` objects (`{ _op, _params }`)
   - sequences (arrays of handlers)
2) Ensure event dispatch sites call:
   - `checkAndRunInternalFunction(handler, payload)`
   for non-function handlers as well.
3) Add capability/allowlist enforcement at the command runner boundary.

---

## Changelog (conceptual)

- **v1:** strings + dev-only functions
- **v2:** JSON commands + sequences for DB-stored realtime views


-- Commands:
```md
# Codex Prompt — Xpell Nano Commands (Authoritative List)

Use **nano commands only** for runtime behavior.
Do NOT emit JavaScript functions for DB-stored views.
All actions must map to whitelisted nano commands.

---

## @xpell/core — XObject (available on ALL objects)

### info
Logs the object id.
```

info

```

### log
Logs a value or the object itself.
```

log 'hello'
log

```

### fire
Fires a global event via XEventManager.
```

fire event:'my-event' data:'payload'

```

### set-attr
Sets a safe attribute on the object instance.
```

set-attr name:'_name' value:'test'

```

### delete-attr
Deletes a safe attribute from the object instance.
```

delete-attr name:'_name'

```

---

## @xpell/ui — XUIObject (UI-only)

### hide
Hides the UI object.
```

hide

```

### show
Shows the UI object.
```

show

```

### toggle
Toggles visibility.
```

toggle

```

### set-text
Sets text content.
```

set-text text:'Hello'

```

### set (legacy alias)
Sets text if `text` param exists.
```

set text:'Hello'

```

### set-text-from-data
Sets text from incoming data payload.
```

set-text-from-data pattern:'Value: $data'

```

### set-text-from-frame
Sets text from frame counter.
```

set-text-from-frame pattern:'Frame $data'

```

### add-class
Adds a CSS class.
```

add-class class:'active'

```

### remove-class
Removes a CSS class.
```

remove-class class:'active'

```

### toggle-class
Toggles a CSS class.
```

toggle-class class:'active'

```

### set-style
Sets an inline style.
```

set-style name:'color' value:'red'

```

### set-attr
Sets a DOM attribute.
```

set-attr name:'aria-label' value:'Close'

```

### remove-attr
Removes a DOM attribute.
```

remove-attr name:'aria-label'

```

---

## @xpell/3d — X3DObject (3D-only)

### rotation
Sets or increments rotation axes.
```

rotation x:0.1 y:++0.02 z:--0.01

```

### spin
Applies continuous rotation via on-frame hook.
```

spin y:0.01

```

### stop
Stops on-frame behavior.
```

stop

```

### follow-joystick
Moves object using joystick data from XData.
```

follow-joystick

```

### orbit
Moves object in an orbit.
```

orbit radius:2 speed:0.02

````

---

## Sequences (native, no extra command)

Multiple nano commands can be executed in order using arrays:

```json
[
  { "_op": "hide" },
  { "_op": "set-text", "_params": { "text": "Hidden" } },
  { "_op": "show" }
]
```

---

## Rules (MANDATORY)

* Prefer **JSON commands** for DB-stored views
* Use **strings only for trivial actions**
* Use **arrays instead of `;` or scripting**
* Never emit `eval`, `new Function`, or inline JS
* If output is stored → it MUST be data-only

This list is the **single source of truth** for Codex and agents.