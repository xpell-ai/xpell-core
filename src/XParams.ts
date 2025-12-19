/**
 * XParams — Command Parameter Accessors
 *
 * Typed parameter helper for Xpell commands.
 *
 * XParams provides a safe, normalized way to read parameters
 * from Xpell command-like objects (`XCmdLike`) using positional
 * or named keys, with optional type coercion and defaults.
 *
 * It is designed to be used by:
 * - Nano commands
 * - XVM internal commands
 * - Runtime command dispatchers
 * - AI- or text-generated command inputs
 *
 * ---
 *
 * ## Responsibilities
 *
 * - Read parameters from `_params` safely
 * - Provide typed accessors (`bool`, `int`, `json`, `str`)
 * - Apply sane defaults and coercion rules
 * - Support both positional and named parameters
 *
 * ---
 *
 * ## Design Notes
 *
 * - Parameter access is defensive and non-throwing
 * - String inputs are normalized when possible
 * - JSON parsing is best-effort and fail-safe
 * - XParams does not mutate command objects
 *
 * ---
 *
 * XParams is a low-level utility and contains no
 * domain-specific logic or side effects.
 * XParams turns loose input into safe intent.
 *
 * @packageDocumentation
 * @since 2022-07-22
 * @author Tamir Fridman
 * @license MIT
 * @copyright
 * © 2022–present Aime Technologies. All rights reserved.
 */


export type XCmdLike =
  | { _params?: Record<string, any> }
  | { getParam?: (pos: number, name: string, def: any) => any; _params?: Record<string, any> };

export class XParams {

  /* -------------------------------------------------- */
  /* core helpers                                       */
  /* -------------------------------------------------- */

  static get(cmd: any, key: string | number, def?: any) {
    if (!cmd?._params) return def;
    const v = cmd._params[key as any];
    return v !== undefined ? v : def;
  }

  static has(cmd: any, key: string | number) {
    return cmd?._params && cmd._params[key as any] !== undefined;
  }

  static str(cmd: any, ...keys: (string | number)[]) {
    for (const k of keys) {
      const v = cmd?._params?.[k as any];
      if (v === undefined || v === null) continue;
      return String(v);
    }
    return undefined;
  }

  /* -------------------------------------------------- */
  /* typed params                                       */
  /* -------------------------------------------------- */

  static bool(cmd: any, key: string | number, def = false): boolean {
    const v = this.get(cmd, key, def);

    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;

    if (typeof v === "string") {
      const s = v.toLowerCase();
      if (["1", "true", "yes", "on"].includes(s)) return true;
      if (["0", "false", "no", "off"].includes(s)) return false;
    }

    return Boolean(v);
  }

  static int(cmd: any, key: string | number, def = 0): number {
    const v = this.get(cmd, key, def);
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) ? n : def;
  }

  static json<T = any>(cmd: any, key: string | number, def?: T): T | undefined {
    const v = this.get(cmd, key, def);

    if (v === undefined || v === null) return def;

    if (typeof v === "object") return v as T;

    if (typeof v === "string") {
      try {
        return JSON.parse(v) as T;
      } catch {
        return def;
      }
    }

    return def;
  }
}
