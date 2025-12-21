export type XErrorLevel = "info" | "warn" | "error" | "fatal";
export type XErrorMeta = { [k: string]: any };

export type XErrorOptions = {
    _level?: XErrorLevel;
    _meta?: XErrorMeta;
    _cause?: unknown;
};

export class XError extends Error {
    _code: string;
    _level: XErrorLevel;
    _meta?: XErrorMeta;
    _cause?: unknown;

    constructor(_code: string, message: string, opts?: XErrorOptions) {
        super(message);
        this.name = "XError";
        this._code = _code;
        this._level = opts?._level ?? "error";
        this._meta = opts?._meta;
        this._cause = opts?._cause;
    }

    toXData() {
        return {
            _code: this._code,
            _level: this._level,
            _meta: this._meta,
            _cause: this._cause,
            // optional: include name/message if you want them in protocol too
            name: this.name,
            message: this.message,
        };
    }

    toJSON() {
        return {
            ...this.toXData(),
            stack: this.stack, // debug-only
        };
    }

}

export default XError;
