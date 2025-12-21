// ============================================================================
// xpell-core/src/XEventManager.ts
// PATCH: adds _owner/_tag to options, keeps backward compatibility
// ============================================================================

/**
 * XEventManager — Runtime Event System (Core)
 *
 * Platform-neutral pub/sub event bus for the Xpell runtime.
 *
 * - No DOM
 * - No Node EventEmitter
 * - Deterministic listener bookkeeping
 *
 * @packageDocumentation
 * @file XEventManager.ts
 */

import { _xlog } from "./XLogger.js";
import { XUtils as _xu } from "./XUtils.js";

export type XEventListenerOptions = {
  _once?: boolean;
  _owner?: any;
  _tag?: string;
};

export interface XEventListener {
  _id: string;
  _callback: Function;
  _options?: XEventListenerOptions;
  _owner?: any; // kept for fast owner cleanup + legacy compatibility
  _tag?: string;
}

export type XEventListenerId = string;

export class _XEventManager {
  _log_rules: {
    register: boolean;
    remove: boolean;
    fire: boolean;
  } = {
    register: false,
    remove: false,
    fire: false,
  };

  // eventName -> listeners[]
  protected _events: Record<string, XEventListener[]> = {};

  // listenerId -> eventName
  protected _listener_index: Record<string, string> = {};

  constructor() {}

  /**
   * Register a listener on an event name (runtime bus only).
   *
   * Backward compatible:
   * - Canonical: on(name, cb, { _once, _owner, _tag })
   * - Legacy:   on(name, cb, { _once }, owner)
   */
  on(
    event_name: string,
    listener: Function,
    options: XEventListenerOptions = {},
    owner?: any
  ): XEventListenerId {
    if (!this._events[event_name]) this._events[event_name] = [];

    const resolved_owner = options?._owner ?? owner;

    const id = _xu.guid();
    const xlistener: XEventListener = {
      _id: id,
      _callback: listener,
      _options: options,
      _owner: resolved_owner,
      _tag: options?._tag,
    };

    this._events[event_name].push(xlistener);
    this._listener_index[id] = event_name;

    if (this._log_rules.register) _xlog.log("XEM Register", event_name, id);
    return id;
  }

  /**
   * Register a listener that will be removed after first fire.
   */
  once(event_name: string, listener: Function, owner?: any): XEventListenerId {
    return this.on(event_name, listener, { _once: true, _owner: owner });
  }

  /**
   * Fire an event with optional payload.
   */
  async fire(event_name: string, data?: any): Promise<void> {
    const list = this._events[event_name];
    if (!list || list.length === 0) return;

    if (this._log_rules.fire) _xlog.log("XEM Fire", event_name, data);

    // snapshot to avoid issues if listeners mutate subscriptions during dispatch
    const snapshot = list.slice();
    const to_remove: string[] = [];

    for (const l of snapshot) {
      try {
        if (l && l._callback) l._callback(data);
      } catch (e) {
        _xlog.error(e);
      }
      if (l?._options?._once) to_remove.push(l._id);
    }

    for (const id of to_remove) this.remove(id);
  }

  /**
   * Remove a listener by id.
   */
  remove(listener_id: string): void {
    const event_name = this._listener_index[listener_id];
    if (!event_name) return;

    const list = this._events[event_name];
    if (list && list.length) {
      const idx = list.findIndex((l) => l?._id === listener_id);
      if (idx >= 0) list.splice(idx, 1);
      if (list.length === 0) delete this._events[event_name];
    }

    delete this._listener_index[listener_id];

    if (this._log_rules.remove) _xlog.log("XEM Remove", event_name, listener_id);
  }

  /**
   * Remove all listeners for a given owner reference.
   */
  removeOwner(owner: any): void {
    if (!owner) return;

    const ids: string[] = [];
    for (const list of Object.values(this._events)) {
      for (const l of list) {
        const l_owner = l?._owner ?? l?._options?._owner;
        if (l_owner === owner) ids.push(l._id);
      }
    }
    ids.forEach((id) => this.remove(id));
  }

  /**
   * Clear the entire event bus (mostly for tests / hard reset).
   */
  clear(): void {
    this._events = {};
    this._listener_index = {};
  }
}

/**
 * Global Xpell event manager instance.
 */
export const XEventManager = new _XEventManager();
export const _xem = XEventManager;

export default XEventManager;
