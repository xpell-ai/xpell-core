# @xpell/core Codex Checklist

Use this checklist before generating or editing code that depends on `@xpell/core`.

- [ ] Do not infer missing runtime state. Use explicit keys/params only.
- [ ] Treat `XData` as shared runtime memory, not persistence or an event bus.
- [ ] Use canonical `XData` APIs (`get/set/delete/touch/patch/on`), not new writes via `_o`.
- [ ] Include stable `source` metadata on `XData.set/delete/touch/pick` calls.
- [ ] Route cross-module behavior through `_x.execute(...)`, `_xem`, or documented `XData` keys.
- [ ] Ensure `_x.execute` payload includes `_module` and `_op`; include `_object` only for explicit object targeting.
- [ ] In `XModule`, expose executable ops as underscore methods (`_op_name`) and keep op names explicit.
- [ ] In `XObject`, keep handlers local/data-first: string, JSON command, or array sequence; avoid function handlers for persisted/agent-editable payloads.
- [ ] Do not assume event listener ordering; treat `_xem` events as coordination signals only.
- [ ] Keep core usage platform-neutral: no UI/DOM/Node-FS assumptions unless the code path explicitly supports that environment.
- [ ] Do not add UI behavior to core base classes (`XObject`, `XModule`, engine).
- [ ] Use structured errors (`XError`) and protocol responses (`XResponse*`) for transport-facing failures.
- [ ] Avoid logging secrets/sensitive payloads; `_xlog` has no built-in redaction guarantee.
- [ ] If docs and source disagree, follow source code and record the mismatch.
