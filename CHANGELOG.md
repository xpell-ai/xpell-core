# Changelog

All notable changes to **xpell-core** are documented in this file.

This project follows **Semantic Versioning** with pre-release tags (`alpha`, `beta`).
Until `2.0.0` stable, breaking changes may occur between alpha versions.

---

## [2.0.0-alpha.1] — 2025-XX-XX

### Summary
First public alpha of the **Xpell Core 2.x runtime**.

This release establishes the new internal architecture that powers XVM, XUI 2.x,
and future Xpell II modules. It introduces an event-driven runtime state model
(**XData2**) that replaces per-frame polling with explicit, observable state updates.

This version is intended for **early adopters, internal framework packages,
and contributors**.

---

### 🚀 Added
- **XData2**: observable runtime shared-state system.
  - Explicit APIs: `set`, `get`, `delete`, `touch`, `patch`
  - Key-based subscriptions (`on`, `onAny`)
  - Backward-compatible legacy access via `XData._o` (deprecated)
- **Binding foundation** in `XObject` enabling event-driven data flow (no polling).
- `XParams`: unified parameter handling for CLI commands, JSON payloads, and runtime calls.
- `docs/XData2.md`: specification for the new runtime shared-state model.
- `ARCHITECTURE.md` documenting the core Xpell 2.x runtime design.
- `CHANGELOG.md` to formalize version history and release notes.

---

### 🔄 Changed
- Refactored **XData** into an observable, event-driven runtime state system.
- Deprecated frame-based polling patterns in favor of explicit subscriptions.
- Clearer separation of responsibilities:
  - **XData** → runtime shared state
  - **XObject** → behavior and binding
  - **XUIObject** → visual/runtime UI representation
- Refactored `XModule` and `XObjectManager` for improved clarity and stronger TypeScript safety.
- Internal cleanup and alignment to support the Xpell 2.x runtime model.

---

### 🛠 Tooling
- Updated build scripts for the 2.x architecture.
- Added `publish-alpha` workflow for prerelease publishing.

---

### ⚠️ Notes
- This is an **alpha release**.
- APIs may change before `2.0.0` stable.
- Direct writes to `XData._o[...]` are deprecated but supported during migration.
- Deep mutations require explicit `touch(key)` to emit updates.
- Polling-based data access will be removed in a future major release.

---

## [1.0.0]

### ⚠️ Breaking
- Removed legacy internal core folder usage.
- Unified runtime exports for use across Xpell modules.

### 🛠 Improvements
- Internal cleanup and improved type safety.
- Event system stabilization.

---

## Pre-2.0 Releases

Earlier versions focused on:
- Initial runtime loop
- Core object model
- Experimental command execution

These versions are considered **legacy** relative to Xpell 2.x.
