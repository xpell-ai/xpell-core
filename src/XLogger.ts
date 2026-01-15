/**
 * XLogger — Xpell Logging Engine (v2)
 *
 * Dev mode:
 *   - `_xlog` is mapped to `console` for correct callsites in DevTools.
 * Production mode:
 *   - `_xlog` is mapped to `XLogger` for consistent formatting & controls.
 */

export type XLogLevel = "log" | "debug" | "warn" | "error";

export type XLoggerOptions = {
    _enabled?: boolean;
    _show_date?: boolean;
    _show_time?: boolean;
    _debug?: boolean;
};

export class _XLogger {
    _enabled: boolean = true;
    _show_date: boolean = false;
    _show_time: boolean = true;
    _debug: boolean = false;

    constructor(opts?: XLoggerOptions) {
        if (opts) this.configure(opts);
    }

    configure(opts: XLoggerOptions) {
        if (typeof opts._enabled === "boolean") this._enabled = opts._enabled;
        if (typeof opts._show_date === "boolean") this._show_date = opts._show_date;
        if (typeof opts._show_time === "boolean") this._show_time = opts._show_time;
        if (typeof opts._debug === "boolean") this._debug = opts._debug;
    }

    private _dt(): string {
        const d = new Date();

        const dd = this._show_date
            ? `${d.getDate()}.${d.getMonth()}.${d.getFullYear()} `
            : "";

        const tt = this._show_time
            ? `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}.${d.getMilliseconds()}|`
            : "";

        return dd + tt;
    }

    log(message?: any, ...optional_params: any[]) {
        if (!this._enabled) return;
        console.log(this._dt(), message, ...optional_params);
    }

    warn(message?: any, ...optional_params: any[]) {
        if (!this._enabled) return;
        console.warn(this._dt(), message, ...optional_params);
    }

    error(message?: any, ...optional_params: any[]) {
        if (!this._enabled) return;
        console.error(this._dt(), message, ...optional_params);
    }

    debug(message?: any, ...optional_params: any[]) {
        if (!this._enabled || !this._debug) return;
        console.debug(this._dt(), message, ...optional_params);
    }
}

/** Singleton */
export const XLogger = new _XLogger();
export default XLogger;

/**
 * Runtime logger alias.
 * - Dev: use `console` (real callsites)
 * - Prod: use `XLogger` (formatted)
 *
 * NOTE: This is evaluated once when the module is loaded.
 */
const _is_production =
    typeof process !== "undefined" &&
    !!process?.env &&
    process.env.NODE_ENV === "production";

if (!_is_production) {
    console.info(
        "[Xpell] _xlog is redirected to console in development mode. Tip: enable 'Show timestamps' in DevTools → Console for timed logs."
    );
}


export const _xlog: Pick<
    Console,
    "log" | "warn" | "error" | "debug"
> = _is_production ? (XLogger as any) : console;
