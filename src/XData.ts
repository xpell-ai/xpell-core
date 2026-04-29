
import { XModule, type XCommand,_xu } from "@xpell/core";

export type XDataStore = Record<string, any>;

export type XDataMeta = {
    source?: string;           // "engine", "xvm", "xui", "legacy", etc.
    trace?: boolean;           // dev: capture stack
};

export type XDataChange = {
    key: string;
    value: any;
    prev: any;
    ts: number;
    op: "set" | "delete" | "touch" | "patch";
    meta?: XDataMeta;
    stack?: string;
};

export type XDataListener = (change: XDataChange) => void;

// XData2
export class _XData {
    // shared objects map
    private _objects: XDataStore = {};

    // listeners
    private _listeners: Map<string, Set<XDataListener>> = new Map();
    private _any_listeners: Set<XDataListener> = new Set();

    // compat / dev knobs
    public _compat_writes = true;       // legacy `_o[key]=...` triggers notifications
    public _warn_legacy_writes = true;   // dev warnings for `_o[key]=...`
    public _verbose = false;           // enables trace capture when meta.trace=true

    public _compat_legacy_keys = true;  // support legacy keys for compatibility

    private _o_proxy: XDataStore | null = null;

    constructor() {
        this._objects = {};
    }

    /**
     * Shared memory view.
     * Reads are always supported.
     * Writes are supported in compat mode (optional) and should be migrated to set()/delete()/touch().
     */

    get _o(): XDataStore {
        if (!this._compat_writes && !this._warn_legacy_writes) return this._objects;

        if (!this._o_proxy) {
            this._o_proxy = new Proxy(this._objects, {
                set: (t, prop, value) => {
                    const key = String(prop);

                    if (this._warn_legacy_writes) {
                        console.warn(
                            `[XData] Legacy write: _o["${key}"] = ... ; prefer XData.set("${key}", value).`
                        );
                    }

                    if (this._compat_writes) this.set(key, value, { source: "legacy:_o" });
                    else (t as any)[key] = value;

                    return true;
                },
                deleteProperty: (t, prop) => {
                    const key = String(prop);

                    if (this._warn_legacy_writes) {
                        console.warn(
                            `[XData] Legacy delete: delete _o["${key}"] ; prefer XData.delete("${key}").`
                        );
                    }

                    if (this._compat_writes) this.delete(key, { source: "legacy:_o" });
                    else delete (t as any)[key];

                    return true;
                }
            }) as XDataStore;
        }

        return this._o_proxy;
    }

    /** Preferred read API */
    get<T = any>(key: string): T | undefined {
        return this._objects[key] as T;
    }

    /** Preferred write API */
    set(key: string, value: any, meta?: XDataMeta) {
        const prev = this._objects[key];
        this._objects[key] = value;
        this._emit({ key, value, prev, ts: Date.now(), op: "set", meta });
    }

    /** Shallow merge helper (nice for state objects) */
    patch(key: string, partial: Record<string, any>, meta?: XDataMeta) {
        const prev = this._objects[key];
        const base = prev && typeof prev === "object" ? prev : {};
        const value = { ...base, ...partial };
        this._objects[key] = value;
        this._emit({ key, value, prev, ts: Date.now(), op: "patch", meta });
    }

    /** In-place mutation notifier */
    touch(key: string, meta?: XDataMeta) {
        const value = this._objects[key];
        this._emit({ key, value, prev: value, ts: Date.now(), op: "touch", meta });
    }

    has(key: string): boolean {
        return Object.prototype.hasOwnProperty.call(this._objects, key);
    }

    delete(key: string, meta?: XDataMeta) {
        const prev = this._objects[key];
        delete this._objects[key];
        this._emit({ key, value: undefined, prev, ts: Date.now(), op: "delete", meta });
    }

    pick<T = any>(key: string, meta?: XDataMeta): T | undefined {
        const v = this._objects[key] as T;
        this.delete(key, meta);
        return v;
    }

    clean() {
        this._objects = {};
        // keep listeners by default (predictable). If you want a full reset, add clean({clearListeners:true})
    }

    // ----------------------------
    // Subscriptions
    // ----------------------------

    on(key: string, fn: XDataListener): () => void {
        let set = this._listeners.get(key);
        if (!set) this._listeners.set(key, (set = new Set()));
        set.add(fn);
        return () => this.off(key, fn);
    }

    off(key: string, fn: XDataListener) {
        const set = this._listeners.get(key);
        if (!set) return;
        set.delete(fn);
        if (set.size === 0) this._listeners.delete(key);
    }

    onAny(fn: XDataListener): () => void {
        this._any_listeners.add(fn);
        return () => this._any_listeners.delete(fn);
    }

    // ----------------------------
    // Emit
    // ----------------------------

    private _emit(change: XDataChange) {
        if (this._verbose && change.meta?.trace) {
            change.stack = new Error().stack;
        }

        const set = this._listeners.get(change.key);
        if (set) for (const fn of set) fn(change);

        for (const fn of this._any_listeners) fn(change);
    }
}

/** Singleton */
export const XData = new _XData();
export const _xd = XData;
export default XData;




export class XDataModule extends XModule {
  static _name = "xd";

  constructor() {
    super({ _name: XDataModule._name });
  }

  async _get(xcmd: XCommand) {
    const params = _xu.ensure_params(xcmd?._params);
    const key = _xu.ensure_string(params.key, "key");

    return {
      _ok: true,
      _result: _xd.get(key)
    };
  }

  async _set(xcmd: XCommand) {
    const params = _xu.ensure_params(xcmd?._params);
    const key = _xu.ensure_string(params.key, "key");

    _xd.set(key, params.value, {
      source: params.source ?? "xd:set"
    });

    return {
      _ok: true,
      _result: { key }
    };
  }

  async _patch(xcmd: XCommand) {
    const params = _xu.ensure_params(xcmd?._params);
    const key = _xu.ensure_string(params.key, "key");

    if (!_xu.is_plain_object(params.value)) {
      throw new Error("xd patch expects value as plain object");
    }

    XData.patch(key, params.value, {
      source: params.source ?? "xd:patch"
    });

    return {
      _ok: true,
      _result: { key }
    };
  }

  async _delete(xcmd: XCommand) {
    const params = _xu.ensure_params(xcmd?._params);
    const key = _xu.ensure_string(params.key, "key");

    XData.delete(key, {
      source: params.source ?? "xd:delete"
    });

    return {
      _ok: true,
      _result: { key }
    };
  }

  async _touch(xcmd: XCommand) {
    const params = _xu.ensure_params(xcmd?._params);
    const key = _xu.ensure_string(params.key, "key");

    XData.touch(key, {
      source: params.source ?? "xd:touch"
    });

    return {
      _ok: true,
      _result: { key }
    };
  }

  async _has(xcmd: XCommand) {
    const params = _xu.ensure_params(xcmd?._params);
    const key = _xu.ensure_string(params.key, "key");

    return {
      _ok: true,
      _result: _xd.has(key)
    };
  }
}

