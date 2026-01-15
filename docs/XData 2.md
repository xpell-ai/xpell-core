# XData2 — Runtime Shared State (Specification)

## One sentence
**XData2 is the observable, in-memory runtime state of the Xpell engine, used for explicit data sharing and signaling between modules and objects during execution.**

---

## What XData2 is
- Process-wide **shared runtime memory**
- Observable (supports subscriptions)
- Explicit (no implicit polling)
- Ephemeral (NOT persistence)
- Engine-level primitive (not UI, not entities)

---

## What XData2 is NOT
- ❌ A database  
- ❌ A persistence layer  
- ❌ A domain/entity store  
- ❌ A replacement for XDB  
- ❌ A UI state manager  

Think of XData2 as: **runtime cache + signals**

---

## Core responsibilities
- Hold shared runtime values (key → value)
- Notify listeners when values change
- Enable object binding without polling
- Support backward compatibility with legacy `_o` access

---

## Data model

```ts
type XDataStore = Record<string, any>;
```

- Keys are strings
- Values can be any runtime-safe JS value
- Keys MUST be stable, named, and documented at their point of use

---

## Access patterns

### Preferred API (XData2)
```ts
XData.set(key, value);
XData.get(key);
XData.delete(key);
XData.touch(key);
XData.patch(key, partial);
```

### Legacy API (deprecated, compat mode)
```ts
XData._o[key] = value;
const v = XData._o[key];
```

> Direct writes to `_o` are **deprecated** and exist only for backward compatibility.

---

## Change tracking semantics

### `set(key, value)`
- Replaces the value
- Emits a change notification
- `prev !== value`

### `touch(key)`
- Value reference stays the same
- Emits a change notification
- Used after in-place mutation
- `prev === value`

### `patch(key, partial)`
- Shallow merge helper
- Emits a change notification

### `delete(key)`
- Removes the key
- Emits a change notification

---

## Subscriptions

```ts
XData.on(key, listener);
XData.onAny(listener);
```

Listener signature:
```ts
(change) => {
  change.key
  change.value
  change.prev
  change.op       // set | delete | touch | patch
  change.ts
  change.meta
}
```

Subscriptions replace **per-frame polling**.

---

## Binding (consumer side)

XData2 is designed to support **binding** from XObject:

```ts
obj.bind("frame-number");
```

Binding means:
- Subscribe once
- React only on changes
- Unsubscribe on dispose

No polling. No frame scanning.

---

## Backward compatibility

### `_o[key] = value`
- Supported in **compat mode**
- Internally routed to `set(key, value)`
- Emits notifications
- Logs dev warning (optional)

### Deep mutation caveat
```ts
XData._o["state"].count++; // NOT detectable
```

Must be followed by:
```ts
XData.touch("state");
```

---

## Compat & dev flags

```ts
XData.compatWrites = true;     // legacy writes notify
XData.warnLegacyWrites = true // dev warnings
XData.verbose = true          // enables trace capture
```

These flags exist to enable **gradual migration**.

---

## Performance characteristics
- No per-frame scanning
- No global polling
- Notifications are O(number of listeners for key)
- Safe to update keys every frame (e.g. frame-number)

---

## Key naming conventions (recommended)

Use namespaces:
- `engine:frame`
- `engine:fps`
- `xvm:route`
- `xui:theme`
- `moduleName:state`

Avoid:
- generic names (`data`, `value`)
- reusing keys for different meanings

---

## Rules (non-negotiable)
- XData2 is runtime-only
- Do not assume persistence
- Do not mirror XData2 into hidden mutable state
- Writes MUST be explicit (`set/touch/delete`)
- `_o` writes are legacy only
- Binding replaces polling

---

## Migration guide (summary)

| Old | New |
|-----|-----|
| `_xd._o[k] = v` | `_xd.set(k, v)` |
| `_xd._o[k]` | `_xd.get(k)` |
| frame polling | `bind(k)` |
| mutate object | `touch(k)` |

---

## Mental model
> XData2 is **the engine’s shared runtime memory + signal bus**, not your data model.
