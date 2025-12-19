# Xpell Core

**Xpell Core** is the foundational runtime of the Xpell framework.  
It provides the core engine, real-time update loop, event system, data layer, and utilities used by XUI (UI engine), X3D (3D engine), and higher-level Xpell modules.

Xpell Core is designed for **high-performance, real-time JavaScript/TypeScript applications**, including:

- real-time UI  
- AI-driven interfaces  
- dashboards  
- data-driven visualizations  
- WebGL/3D experiences  
- vibe-coded apps (LLM-assisted development)

If you are building with Xpell, this package provides the low-level primitives the rest of the framework depends on.

## Features

- Real-time engine update loop  
- Event and signal system  
- Core data structures  
- Object lifecycle management  
- Shared utilities for UI, 3D, and AI modules  
- Zero-dependency, lightweight foundation  
- Written in TypeScript  

## Installation

    npm install xpell-core
    pnpm add xpell-core
    yarn add xpell-core

## Usage

xpell-core provides low-level building blocks for the Xpell framework. Below is a simple example showing how to use Xpell Core's event system and update loop.

## When to use Xpell Core

Use xpell-core directly if you are:

- Building low-level extensions for Xpell  
- Creating custom UI components  
- Developing new rendering pipelines  
- Writing real-time, loop-driven modules  
- Integrating AI-powered reactive systems  
- Working inside internal Xpell packages  

Most end-users should install:

    npm install xpell

which includes xpell-core automatically.

## Who Should Use xpell-core Directly?

Most developers should **not** depend on xpell-core directly.

Use xpell-core only if you are:
- Developing Xpell framework modules
- Building custom runtime systems
- Extending XModule or XObject internals
- Working on Xpell UI / 3D / server internals

For application development, use:
- xpell-ui
- xpell


## Relationship to the Xpell Framework

Xpell Core powers all other Xpell packages:

- xpell-ui  
- xpell-3d  
- xpell  
- future Xpell II modules  

## Documentation

For a detailed overview of the Xpell architecture, see  
[`docs/architecture/overview.md`](docs/architecture/overview.md).

## Links

https://xpell.ai

GitHub:  
https://github.com/xpell-ai/xpell-core

## Versioning

xpell-core follows **semantic versioning**, aligned with the main Xpell release stream.

## License

MIT License — © Aime Technologies, 2022–Present
