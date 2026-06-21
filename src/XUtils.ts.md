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


  deepMergeDefaults<T>(data: Partial<T> | undefined, defaults: T): T {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return structuredClone(defaults);
    }

    const result: any = structuredClone(defaults);

    for (const key of Object.keys(data as any)) {
      const value = (data as any)[key];
      const defaultValue = (defaults as any)?.[key];

      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        defaultValue &&
        typeof defaultValue === "object" &&
        !Array.isArray(defaultValue)
      ) {
        result[key] = this.deepMergeDefaults(value, defaultValue);
      } else {
        result[key] = value;
      }
    }

    return result;
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


  // ============================================================================
  // AI / Runtime Primitive Helpers
  // ============================================================================

  normalize_prompt(prompt: unknown): string {
    return String(prompt ?? "")
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim();
  }

  normalize_prompt_key(prompt: unknown): string {
    return this.normalize_prompt(prompt)
      .toLowerCase()
      .replace(/[_/]+/g, " ");
  }

  is_non_empty_string(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }

  has_value(value: unknown): boolean {
    if (value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  }

  ensure_array<T = any>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    if (value === undefined || value === null) return [];
    return [value as T];
  }

  to_record(value: unknown): Record<string, any> {
    return this.is_plain_object(value) ? value : {};
  }

  safe_json_parse<T = any>(value: unknown, fallback: T): T {
    if (typeof value !== "string") return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  safe_json_stringify(value: unknown, fallback = "{}"): string {
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  clone_json<T>(value: T): T {
    return this.safe_json_parse<T>(
      this.safe_json_stringify(value, "null"),
      value
    );
  }

  get_path(obj: unknown, path: string | string[], fallback?: any): any {
    const parts = Array.isArray(path)
      ? path
      : String(path ?? "").split(".").filter(Boolean);

    let current: any = obj;

    for (const part of parts) {
      if (current === undefined || current === null) return fallback;
      current = current[part];
    }

    return current === undefined ? fallback : current;
  }

  set_path(obj: Record<string, any>, path: string | string[], value: any): Record<string, any> {
    const parts = Array.isArray(path)
      ? path
      : String(path ?? "").split(".").filter(Boolean);

    if (!parts.length) return obj;

    let current: any = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      if (!this.is_plain_object(current[part])) {
        current[part] = {};
      }

      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
    return obj;
  }

  pick_defined(source: Record<string, any>, keys: string[]): Record<string, any> {
    const out: Record<string, any> = {};
    if (!this.is_plain_object(source) || !Array.isArray(keys)) return out;

    for (const key of keys) {
      const value = source[key];
      if (value !== undefined && value !== null) out[key] = value;
    }

    return out;
  }

  omit_undefined(source: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    if (!this.is_plain_object(source)) return out;

    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined) out[key] = value;
    }

    return out;
  }
  escape_regexp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  matches_keyword(prompt: string, keyword: string): boolean {
    const suffix: string = /^[a-z0-9]+$/.test(keyword) ? "s?" : "";
    const pattern: RegExp = new RegExp(
      `(^|[^a-z0-9])${this.escape_regexp(keyword)}${suffix}($|[^a-z0-9])`
    );

    return pattern.test(prompt);
  }

  match_keywords(prompt: string, keywords: string[]): string[] {
    return keywords.filter((keyword: string): boolean => this.matches_keyword(prompt, keyword));
  }

  contains_keyword(prompt: string, keywords: string[]): boolean {
    return this.match_keywords(prompt, keywords).length > 0;
  }
  read_optional_string(value: unknown, field_name: string): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Invalid '${field_name}': expected non-empty string`);
    }
    return value.trim();
  }

  /**
 * Returns unique string values while preserving insertion order.
 *
 * Example:
 * ["a", "b", "a"] -> ["a", "b"]
 */
  unique_strings(values: string[]): string[] {
    return Array.from(new Set(values));
  }

  /**
   * Normalizes IDs (trim + lowercase) and removes duplicates.
   *
   * Example:
   * [" User ", "user", "ADMIN"] -> ["user", "admin"]
   */
  unique_normalized_ids(ids: string[]): string[] {
    return Array.from(
      new Set(
        ids
          .map((id) => id.trim().toLowerCase())
          .filter((id) => id.length > 0)
      )
    );
  }

  /**
   * Truncates long text while preserving the beginning.
   * Appends a truncation marker when the text exceeds max_chars.
   */
  truncate_text(value: string, max_chars: number): string {
    if (value.length <= max_chars) return value;

    return `${value.slice(0, Math.max(0, max_chars - 18))}\n...[truncated]`;
  }

  /**
   * Serializes a value as formatted JSON and truncates the result
   * when it exceeds the specified character limit.
   */
  compact_json(value: unknown, max_chars = 5000): string {
    return this.truncate_text(
      JSON.stringify(value, null, 2),
      max_chars
    );
  }

  /**
   * Serializes a value as compact single-line JSON and truncates
   * the result when it exceeds the specified character limit.
   */
  compact_inline_json(value: unknown, max_chars = 5000): string {
    return this.truncate_text(
      JSON.stringify(value),
      max_chars
    );
  }

  /**
   * Safe version of compact_inline_json().
   * Returns an empty string when serialization fails.
   */
  safe_compact_inline_json(value: unknown, max_chars = 5000): string {
    try {
      return this.compact_inline_json(value, max_chars);
    } catch {
      return "";
    }
  }

  /**
   * Returns the first max_items items from an array.
   * Returns an empty array for non-array values.
   */
  compact_array<T = any>(
    value: unknown,
    max_items = 20
  ): T[] {
    if (!Array.isArray(value)) return [];
    return value.slice(0, max_items) as T[];
  }

  /**
   * Normalizes arbitrary text into a stable identifier.
   *
   * Example:
   * "User Profile" -> "user-profile"
   * "user_profile" -> "user-profile"
   */
  normalize_id(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;

    const id = value
      .toLowerCase()
      .trim()
      .replace(/[_\s]+/gu, "-")
      .replace(/[^a-z0-9-]+/gu, "-")
      .replace(/-+/gu, "-")
      .replace(/^-|-$/gu, "");

    return id.length > 0 ? id : undefined;
  }

  /**
   * Normalizes an array of identifiers and removes duplicates.
   *
   * Example:
   * ["User Profile", "user-profile"]
   * -> ["user-profile"]
   */
  normalize_id_array(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    return value
      .map((item) => this.normalize_id(item))
      .filter((item): item is string => typeof item === "string")
      .filter((item, index, all) => all.indexOf(item) === index);
  }

  /**
   * @deprecated Use normalize_id_array().
   */
  normalize_string_array(value: unknown): string[] {
    return this.normalize_id_array(value);
  }

  /**
   * Returns only plain object items from an array.
   * Non-object values, nulls, and arrays are ignored.
   */
  ensure_object_array<T extends Record<string, any> = Record<string, any>>(
    value: unknown
  ): T[] {
    if (!Array.isArray(value)) return [];

    return value.filter(
      (item): item is T => this.is_plain_object(item)
    );
  }

  /**
   * @deprecated Use ensure_object_array().
   */
  read_object_array<T extends Record<string, any> = Record<string, any>>(
    value: unknown
  ): T[] {
    return this.ensure_object_array<T>(value);
  }
}

// --------------------------------------------------------------------------
// Singleton exports (canonical Xpell style)
// --------------------------------------------------------------------------

const XUtils = new _XUtils();
const _xu = XUtils;

export { XUtils, _xu };
export default XUtils;
