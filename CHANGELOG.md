# Changelog

## [2.0.0-alpha.1] — 2025-XX-XX

### Summary
First public alpha of the Xpell Core 2.x runtime.  
This release establishes the new internal architecture that powers XVM, XUI 2.x, and future Xpell II modules.

### Changed
- Refactored `XModule` and `XObjectManager` for improved clarity and stronger TypeScript type safety
- Internal cleanup and alignment to support the new 2.x runtime model

### Added
- `XParams`: unified parameter handling for CLI commands, JSON payloads, and runtime calls
- `ARCHITECTURE.md` documenting the core runtime design
- `CHANGELOG.md` to formalize version history and release notes

### Tooling
- Updated build scripts
- Added `publish-alpha` workflow for prerelease publishing

### Notes
- This is an **alpha release**
- APIs may change before 2.0.0 stable
- Intended for early adopters and internal framework packages


All notable changes to **xpell-core** will be documented in this file.

This project follows **Semantic Versioning** with pre-release tags (`alpha`, `beta`).
Until `1.0.0`, breaking changes may occur between alpha versions.

### 🚀 Added
- Stabilized runtime APIs for XVM and app-level orchestration.
- Extended command interpreter support for application-level commands.
- Improved XParams utilities for mixed CLI / JSON usage.

### 🔄 Changed
- Internal refactoring to support XVMApp-driven application loading.
- Clearer separation between runtime, module loading, and execution flow.
- 

### ⚠️ Notes
- This release aligns xpell-core with the new Xpell 2.x app architecture.
- Server-side runtimes will build directly on these APIs.

---

## [1.0.0]

### ⚠️ Breaking
- Removed legacy internal core folder usage.
- Unified runtime exports for use across Xpell modules.

### 🛠 Improvements
- Internal cleanup and type safety improvements.
- Event system stabilization.

---

## Pre-2.0 Releases

Earlier versions focused on:
- Initial runtime loop
- Core object model
- Experimental command execution

These versions are considered **legacy** relative to Xpell 2.x.
