# @xpell/core

Xpell 2 Alpha --- AI-Native Runtime Engine

`@xpell/core` is the foundational execution layer of the Xpell 2
platform.

It defines the runtime contracts that power the entire ecosystem,
including:

-   `@xpell/ui` (real-time UI layer)
-   `@xpell/3d` (spatial runtime)
-   `@xpell/node` (server runtime)

Xpell Core is designed for real-time, AI-collaborative systems --- where
applications can evolve at runtime instead of relying solely on rebuild
cycles.

> This package is part of the Xpell 2 Alpha platform.\
> See the full release overview at https://xpell.ai

------------------------------------------------------------------------

## What @xpell/core Provides

### XData 2

Structured shared runtime state for predictable mutation and
coordination.

### Nano-Commands 2

Command handlers defined as text or structured JSON, enabling safe
serialization and AI-driven runtime edits.

### XEM (Xpell Event Manager)

A lightweight process-wide event bus for decoupled runtime coordination.

### XModule

The only valid extension point for behavior in the Xpell runtime.

### XObject

The base runtime object model (UI behavior lives only in `@xpell/ui`).

### Execution Loop

Deterministic real-time update cycle for dynamic systems.

------------------------------------------------------------------------

## Design Principles

-   Runtime-first architecture
-   Explicit contracts over hidden state
-   Modular extension via XModule
-   No UI assumptions inside core
-   Zero external dependencies
-   TypeScript-native

------------------------------------------------------------------------

## Installation (Alpha)

npm install @xpell/core@alpha

You will typically combine it with:

npm install @xpell/ui@alpha\
npm install @xpell/node@alpha\
npm install @xpell/3d@alpha

Alpha builds are intentionally not published under the `latest` tag.

------------------------------------------------------------------------

## When to Use @xpell/core Directly

Most application developers should work with higher-level packages.

Use `@xpell/core` directly if you are:

-   Building runtime extensions
-   Creating custom XModule implementations
-   Extending engine-level primitives
-   Working on Xpell internals
-   Developing advanced AI-driven runtime systems

------------------------------------------------------------------------

## Architecture Role in Xpell 2

Xpell 2 is modular:

-   `@xpell/core` → Runtime contracts + execution engine\
-   `@xpell/ui` → Real-time UI framework\
-   `@xpell/3d` → Three.js-based spatial runtime\
-   `@xpell/node` → Server runtime (xnode, Wormholes, XDB)

Core defines the execution model.\
Other packages implement specialized layers on top of it.

------------------------------------------------------------------------

## Alpha Status

This package is currently in Alpha.

-   APIs may evolve
-   Contracts may be refined
-   Performance optimizations are ongoing

This release is intended for architectural experimentation and early
adopters.

------------------------------------------------------------------------

## Documentation & Links

Website: https://xpell.ai\
GitHub: https://github.com/xpell-ai/xpell-core

------------------------------------------------------------------------

## Versioning

Follows semantic versioning under the Xpell 2 release stream.

------------------------------------------------------------------------

## License

MIT License --- © Aime Technologies
