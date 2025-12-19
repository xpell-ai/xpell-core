# Xpell Core – Architecture

> **Status:** Alpha (2.0.x)  
> **Audience:** Framework developers, engine builders, internal Xpell modules

This document describes the **architecture and responsibilities** of **xpell-core**,
the foundational runtime of the Xpell framework.

Xpell Core is intentionally **headless** and **UI-agnostic**.
It provides the execution model that all other Xpell modules build upon.

---

## Purpose of xpell-core

`xpell-core` exists to answer one question:

> **How do we run real-time, data-driven applications in a deterministic way?**

It does **not** render UI.
It does **not** know about the DOM.
It does **not** assume a browser.

Instead, it provides:

- A real-time execution loop
- An event & signal system
- A unified object model
- A command & interpreter layer
- Shared utilities for higher-level modules

---

## High-level Architecture

```
┌─────────────────────────┐
│     Application Logic   │
│  (UI / 3D / AI / Game)  │
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│       xpell-core        │
│  Runtime / Interpreter │
│  Events / Loop / Data  │
└─────────────────────────┘
```

All higher-level modules (UI, 3D, AI) **depend on xpell-core**,
but xpell-core depends on none of them.

---

## Core Concepts

### Runtime Loop

At the heart of xpell-core is a **real-time update loop**.

Responsibilities:
- Frame-based updates
- Deterministic execution order
- Optional FPS throttling
- Shared timing reference for all modules

This makes Xpell suitable for:
- Dashboards
- Simulations
- Games
- AI-driven reactive systems

---

### XObject – Unified Object Model

`XObject` is the base class for all Xpell entities.

It provides:
- Lifecycle hooks (`onCreate`, `onMount`, `onDispose`)
- Event binding
- Data export/import
- Debug support
- Parent/child relationships

Every major concept in Xpell (UI objects, DB entities, commands)
extends from `XObject`.

---

### Event System (XEM)

Xpell Core includes a lightweight event system:

- Global and object-scoped events
- One-time or persistent listeners
- Deterministic dispatch order
- No DOM dependency

This system is used everywhere:
- UI lifecycle
- Navigation
- Data changes
- AI triggers

---

### Nano Commands & Interpreter

Xpell Core provides a **command interpreter** that allows:

- Declarative commands (JSON or string)
- CLI-style execution
- Runtime scripting
- AI-driven behavior injection

This enables:
- Vibe coding
- LLM-generated logic
- Remote control via messages
- Data-driven workflows

---

### XParams – Unified Parameter Parsing

All commands use `XParams` to:
- Read typed parameters
- Support snake_case and camelCase
- Work across CLI, JSON, and runtime calls

This ensures consistency across:
- CLI
- Network messages
- Internal execution

---

## What xpell-core Does NOT Do

By design, xpell-core does **not**:

- Touch the DOM
- Render UI
- Perform layout
- Know about CSS
- Assume browser-only execution

This keeps it:
- Lightweight
- Testable
- Reusable
- Server-compatible

---

## Relationship to Other Packages

- **xpell-ui** → UI rendering + navigation (depends on core)
- **xpell-3d** → WebGL / 3D engine (depends on core)
- **xpell** → Unified distribution
- **Future modules** → Build on core primitives

`xpell-core` is the **lowest layer** in the stack.

---

## Design Philosophy

- Runtime-first, not compile-time
- Deterministic behavior over convenience
- Explicit data over implicit state
- Friendly to AI systems and interpreters

---

## Future Directions

- Server-side runtimes
- Worker-based execution
- Distributed event buses
- Deterministic replay
- State snapshots & rollback

---

## Final Note

> **If Xpell UI is about interfaces, xpell-core is about execution.**

This separation is intentional and foundational to the Xpell platform.
