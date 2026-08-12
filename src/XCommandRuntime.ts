/**
 * XCommandRuntime centralizes command parameter resolution and output routing.
 *
 * It is a shared execution helper only; modules and objects keep their existing
 * dispatch responsibilities.
 */

import { _xd as defaultXData } from "./XData.js";
import { _xu } from "./XUtils.js";

type XDataRuntimeStore = {
    get(key: string): any;
    has(key: string): boolean;
    set(key: string, value: any, meta?: any): any;
};

export type XCommandRuntimeResolveOptions = {
    _prev?: any;
    _data?: any;
    _event?: any;
    _context?: Record<string, any>;
    _xd?: XDataRuntimeStore | null;
};

export type XCommandOutputTarget = {
    _target?: string;
    _key?: string;
    _path?: string;
};

export type XCommandRuntimeOutputOptions = {
    _xd?: XDataRuntimeStore | null;
};

export class XCommandRuntime {
    private static resolvePath(root: any, pathText: string): any {
        const path = pathText.split(".");
        let cur = root;

        for (const p of path) {
            if (cur == null) return undefined;
            cur = cur[p];
        }

        return cur;
    }

    private static resolvePreviousPath(previous_result: any, pathText: string): any {
        const direct = this.resolvePath(previous_result, pathText);
        if (direct !== undefined) return direct;

        if (
            previous_result &&
            typeof previous_result === "object" &&
            typeof previous_result._ok === "boolean" &&
            previous_result._result !== undefined
        ) {
            return this.resolvePath(previous_result._result, pathText);
        }

        return undefined;
    }

    static resolveValue(
        val: any,
        options: XCommandRuntimeResolveOptions = {}
    ): any {
        const previous_result = options._prev;
        const eventData = options._event ?? options._data;
        const data = options._data ?? eventData;
        const context = options._context;
        const xdata = options._xd === undefined
            ? defaultXData
            : options._xd;

        if (typeof val === "string") {
            if (val === "$prev") return previous_result;

            if (val.startsWith("$prev.")) {
                return this.resolvePreviousPath(
                    previous_result,
                    val.slice(6)
                );
            }

            if (val === "$event") return eventData;

            if (val.startsWith("$event.")) {
                return this.resolvePath(
                    eventData,
                    val.slice(7)
                );
            }

            if (val === "$data") return data;

            if (val.startsWith("$data.")) {
                return this.resolvePath(
                    data,
                    val.slice(6)
                );
            }

            if (val.startsWith("$xdata:") || val.startsWith("$xdata.")) {
                if (!xdata) return undefined;

                const expr =
                    val.startsWith("$xdata:")
                        ? val.slice("$xdata:".length)
                        : val.slice("$xdata.".length);

                const parts = expr.split(".");

                for (let i = parts.length; i > 0; i--) {
                    const key = parts.slice(0, i).join(".");

                    if (xdata.has(key)) {
                        const root = xdata.get(key);
                        const path = parts.slice(i).join(".");

                        return path ? _xu.get_path(root, path) : root;
                    }
                }

                return undefined;
            }

            if (
                val.startsWith("$") &&
                context &&
                typeof context === "object"
            ) {
                const expr = val.slice(1);
                const dot = expr.indexOf(".");
                const root =
                    dot === -1
                        ? expr
                        : expr.slice(0, dot);
                const path =
                    dot === -1
                        ? ""
                        : expr.slice(dot + 1);

                if (
                    Object.prototype.hasOwnProperty.call(
                        context,
                        root
                    )
                ) {
                    const ctx = context[root];

                    return path
                        ? this.resolvePath(ctx, path)
                        : ctx;
                }
            }

            return val;
        }

        if (Array.isArray(val)) {
            return val.map(item =>
                this.resolveValue(
                    item,
                    options
                )
            );
        }

        if (val && typeof val === "object") {
            const out: any = {};

            for (const k of Object.keys(val)) {
                out[k] = this.resolveValue(
                    val[k],
                    options
                );
            }

            return out;
        }

        return val;
    }

    static resolveParams(
        params: any,
        options: XCommandRuntimeResolveOptions = {}
    ): any {
        return this.resolveValue(params, options);
    }

    static applyOutput(
        command: { _output?: XCommandOutputTarget } | null | undefined,
        result: any,
        options: XCommandRuntimeOutputOptions = {}
    ): any {
        const output = command?._output;

        if (!output) return result;
        if (output._target !== "xdata") return result;
        if (typeof output._key !== "string" || output._key.length === 0) return result;

        const xdata = options._xd === undefined
            ? defaultXData
            : options._xd;

        if (!xdata) return result;

        const value =
            typeof output._path === "string" && output._path.length > 0
                ? _xu.get_path(result, output._path)
                : result;

        xdata.set(output._key, value, {
            source: "xcommand-runtime"
        });

        return result;
    }
}

export default XCommandRuntime;
