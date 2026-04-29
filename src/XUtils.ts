/**
 * XUtils — Xpell Utility Package
 *
 * Shared utility functions used across the Xpell runtime.
 *
 * Provides small, focused helpers that support core modules
 * (XUI, XVM, XDB, Wormholes) without introducing cross-module
 * dependencies or architectural coupling.
 *
 * ---
 *
 * ## Design Principles
 *
 * - Stateless and side-effect minimal
 * - No runtime ownership or lifecycle management
 * - Safe to use across client, server, and tooling
 * - Free of UI, navigation, and data-layer assumptions
 *
 * ---
 *
 * XUtils exists to reduce duplication while keeping the core
 * architecture clean and modular.
 *
 * @packageDocumentation
 * @since 2022-07-22
 * @author Tamir Fridman
 * @copyright © 2022–present Aime Technologies. All rights reserved.
 * @license MIT
 */

// ============================================================================
// xpell-core/src/XUtils.ts
// Core utility helpers (platform-agnostic)
// ============================================================================

export type XFrameScheduler = (cb: () => void) => void;

export const TWO_PI = 2 * Math.PI;

export class _XUtils {
  /**
   * Create ignore list for parser to ignore spell words
   * @param list - comma-separated list of words
   * @param reservedWords - base reserved words map (mutated)
   */
  createIgnoreList(list: string, reservedWords: Record<string, any>) {
    if (!list) return reservedWords;

    const words = list.split(",").map((w) => w.trim()).filter(Boolean);
    for (const word of words) reservedWords[word] = "";
    return reservedWords;
  }

  /**
   * GUID / UUID v4 (cross-platform)
   *
   * Preference order:
   * 1) globalThis.crypto.randomUUID()
   * 2) globalThis.crypto.getRandomValues() (RFC4122 v4)
   * 3) Math.random() fallback (NOT crypto-secure, legacy fallback only)
   */
  guid(): string {
    const g: any = globalThis as any;
    const c: any = g.crypto;

    // Preferred native implementation
    if (c && typeof c.randomUUID === "function") {
      return c.randomUUID();
    }

    // Secure fallback (browser / node with WebCrypto)
    if (c && typeof c.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      c.getRandomValues(bytes);

      // RFC 4122 version & variant bits
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant

      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
      return (
        hex.slice(0, 4).join("") +
        "-" +
        hex.slice(4, 6).join("") +
        "-" +
        hex.slice(6, 8).join("") +
        "-" +
        hex.slice(8, 10).join("") +
        "-" +
        hex.slice(10, 16).join("")
      );
    }

    // Legacy fallback (kept to avoid hard failure on very old runtimes)
    // NOTE: not cryptographically secure.
    const chars = "0123456789abcdef".split("");
    const uuid: string[] = [];
    let r: number;

    uuid[8] = uuid[13] = uuid[18] = uuid[23] = "-";
    uuid[14] = "4"; // version 4

    for (let i = 0; i < 36; i++) {
      if (!uuid[i]) {
        r = (0 | (Math.random() * 16)) >>> 0;
        uuid[i] = chars[i === 19 ? ((r & 0x3) | 0x8) : (r & 0xf)];
      }
    }
    return uuid.join("");
  }

  /**
   * Merge defaults into data object (mutates data)
   * @param data - target data
   * @param defaults - defaults object
   * @param force - overwrite existing values
   */
  mergeDefaultsWithData(data: any, defaults: any, force: boolean = false) {
    if (!data) return defaults;

    // Ensure _id
    if (!data["_id"]) {
      data["_id"] = data["id"] ?? this.guid();
    }

    for (const key of Object.keys(defaults)) {
      if (!(key in data) || force) data[key] = defaults[key];
    }

    return data;
  }

  /**
   * Encode string to Base64 (UTF-8 safe, cross-platform)
   */
  encode(str: string): string {
    const g: any = globalThis as any;

    // Browser
    if (typeof g.btoa === "function") {
      // UTF-8 -> binary -> btoa
      const utf8 = encodeURIComponent(String(str)).replace(
        /%([0-9A-F]{2})/g,
        (_m: string, p1: string) => String.fromCharCode(parseInt(p1, 16))
      );
      return g.btoa(utf8);
    }

    // Node (Buffer is global in Node)
    if (g.Buffer && typeof g.Buffer.from === "function") {
      return g.Buffer.from(String(str), "utf8").toString("base64");
    }

    throw new Error("Base64 encode not supported in this environment");
  }

  /**
   * Decode Base64 string to UTF-8 (cross-platform)
   */
  decode(str: string): string {
    const g: any = globalThis as any;

    // Browser
    if (typeof g.atob === "function") {
      const bin = g.atob(String(str));
      // binary -> UTF-8
      const pct = Array.prototype
        .map
        .call(bin, (c: string) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("");
      return decodeURIComponent(pct);
    }

    // Node
    if (g.Buffer && typeof g.Buffer.from === "function") {
      return g.Buffer.from(String(str), "base64").toString("utf8");
    }

    throw new Error("Base64 decode not supported in this environment");
  }

  /**
   * Returns a random integer between min and max (inclusive)
   * NOTE: Not cryptographically secure (OK for UI, NOT for IDs)
   */
  getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Extract parameter from XCommand
   */
  getParam(xcmd: any, paramName: string, defaultValue: any = 0) {
    return xcmd?._params?.[paramName] ?? defaultValue;
  }

  /**
   * Default frame scheduler (cross-platform)
   * - Browser: requestAnimationFrame
   * - Node / non-DOM: setImmediate (fast) or setTimeout (paced by target fps)
   */
  createDefaultScheduler(_target_fps?: number): XFrameScheduler {
    const g: any = globalThis as any;

    // Browser / DOM-like env
    if (typeof g.requestAnimationFrame === "function") {
      return (cb) => g.requestAnimationFrame(cb);
    }

    const fps =
      typeof _target_fps === "number" && isFinite(_target_fps) && _target_fps > 0
        ? _target_fps
        : 60;

    // If caller didn't request low FPS, run ASAP (good for headless tools)
    if (typeof g.setImmediate === "function" && (!_target_fps || _target_fps >= 60)) {
      return (cb) => g.setImmediate(cb);
    }

    const ms = Math.max(1, Math.round(1000 / fps));
    return (cb) => g.setTimeout(cb, ms);
  }



  to_iso_now(): string {
    return new Date().toISOString();
  }

  is_plain_object(value: unknown): value is Record<string, any> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  ensure_string(value: unknown, field: string): string {
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Invalid '${field}'`);
    }
    return value.trim();
  }

  ensure_params(raw: unknown): Record<string, any> {
    return this.is_plain_object(raw) ? raw : {};
  }

  /**
   * Copy keys from source to target only when value is not null/undefined.
   * Keeps valid falsy values (0, false, "").
   */
  addIfNotNull(source: any, target: any, keys: string[]) {
    if (!source || !target || !Array.isArray(keys)) return;
    for (const k of keys) {
      const v = source[k];
      if (v !== undefined && v !== null) target[k] = v;
    }
  }

   /**
   * Add Last Slash
   * adds a last slash to the url if it doesn't have one
   */
  als(url: string) {
    const s = String(url ?? "");
    return s.endsWith("/") ? s : s + "/";
  }

  /**
   * Clear Last Slash
   * removes the last slash if exists
   */
  cls(url: string) {
    const s = String(url ?? "");
    return s.endsWith("/") ? s.slice(0, -1) : s;
  }

  /**
   * Add First Slash
   */
  afs(url: string) {
    const s = String(url ?? "");
    return s.startsWith("/") ? s : "/" + s;
  }

  /**
   * Clear First Slash
   */
  cfs(url: string) {
    const s = String(url ?? "");
    return s.startsWith("/") ? s.slice(1) : s;
  }

  /**
   * Calculates expiration time based on short format:
   *  - 1h (hours)
   *  - 2d (days)
   *  - 3y (years, 365d)
   * Returns epoch ms (now + delta).
   */
  calculateExpiration(exp: string) {
    const s = String(exp ?? "").trim();
    const match = s.match(/^(\d+)([hdy])$/);
    if (!match) throw new Error("Invalid expiration format. Use: 1h | 2d | 3y");

    const quantity = Number.parseInt(match[1], 10);
    const unit = match[2] as "h" | "d" | "y";

    const now = Date.now();

    let addedTime = 0;
    switch (unit) {
      case "h":
        addedTime = quantity * 60 * 60 * 1000;
        break;
      case "d":
        addedTime = quantity * 24 * 60 * 60 * 1000;
        break;
      case "y":
        addedTime = quantity * 365 * 24 * 60 * 60 * 1000;
        break;
    }

    return now + addedTime;
  }
}

// --------------------------------------------------------------------------
// Singleton exports (canonical Xpell style)
// --------------------------------------------------------------------------

const XUtils = new _XUtils();
const _xu = XUtils;

export { XUtils, _xu };
export default XUtils;

/**
 * FPS Calculator (cross-platform + stable)
 *
 * - Works in browser + node (performance.now() else Date.now()).
 * - Smooths frame time via EMA (ms/frame).
 * - Deadband prevents 119↔120 flicker.
 *
 * Notes:
 * - If your engine runs at 1 FPS on node, this will naturally converge to ~1.
 * - This is O(1) work per frame (a few ops) and will not affect frame rate.
 */
export class FPSCalc {
  #fps = 0; // displayed fps (stable)
  #avgFrameMs = 0; // EMA of ms/frame
  #lastTs = 0;

  #alpha: number; // weight of new samples (0..1)
  #deadband: number; // minimum integer change to update displayed fps

  constructor(alpha = 0.05, deadband = 1) {
    const a = Number(alpha);
    this.#alpha = Number.isFinite(a) ? Math.min(1, Math.max(0.001, a)) : 0.05;

    const d = Number(deadband);
    this.#deadband = Number.isFinite(d) ? Math.max(0, Math.floor(d)) : 1;
  }

  private now(): number {
    const p: any = (globalThis as any).performance;
    if (p && typeof p.now === "function") return p.now();
    return Date.now();
  }

  calc(): number {
    const now = this.now();

    // first call: seed timestamp (return 0 until we have a delta)
    if (this.#lastTs === 0) {
      this.#lastTs = now;
      return this.#fps;
    }

    const diff = now - this.#lastTs;
    this.#lastTs = now;

    if (!Number.isFinite(diff) || diff <= 0) return this.#fps;

    // EMA on ms/frame
    if (this.#avgFrameMs === 0) this.#avgFrameMs = diff;
    else this.#avgFrameMs = (1 - this.#alpha) * this.#avgFrameMs + this.#alpha * diff;

    const rawFps = 1000 / this.#avgFrameMs;
    if (!Number.isFinite(rawFps) || rawFps <= 0) return this.#fps;

    const next = Math.round(rawFps); // round is less twitchy than floor

    // deadband: prevents 119/120 bouncing
    if (this.#fps !== 0 && this.#deadband > 0) {
      if (Math.abs(next - this.#fps) < this.#deadband) return this.#fps;
    }

    this.#fps = next;
    return this.#fps;
  }

  reset() {
    this.#fps = 0;
    this.#avgFrameMs = 0;
    this.#lastTs = 0;
  }
}
