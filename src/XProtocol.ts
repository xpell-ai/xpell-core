/**
 * XProtocol — Core Response Envelope (Pre-Wormholes v1)
 *
 * Defines the canonical, transport-agnostic response format used by Xpell
 * runtimes and clients **before** Wormholes / streaming / routing layers.
 *
 * This protocol is:
 * - Platform-neutral (no Node, DOM, or transport dependencies)
 * - JSON-safe and serializable across process, thread, and network boundaries
 * - Shared between server and client as a strict wire contract
 *
 * Design rules:
 * - XResponseData is the FINAL response shape for v1
 * - Errors are represented via XError.toXData() inside `_result`
 * - Timing fields (`_ts`, `_pt`) are measured on the responder side
 * - Clients must treat this object as immutable protocol data
 *
 * IMPORTANT:
 * - Do NOT add transport concerns here (request IDs, peers, streams, auth)
 * - Do NOT mutate XResponseData once sent
 * - Wormholes and future protocols MUST wrap this envelope, not modify it
 *
 * @package xpell-core
 * @version 2.0.0-alpha
 * @author Tamir Fridman <DrXoom>
 */


import XError from "./XError.js";


export type XResponseData = {
  _ok: boolean;   // operation status
  _ts: number;    // responder timestamp (ms since epoch)
  _pt: number;    // processing time on responder (ms)
  _result: any;   // success payload OR XError.toXData()
};

export class XResponse {
  _ok: boolean = false;
  _ts: number = Date.now();
  _pt: number = 0;
  _result: any;

  constructor(data?: Partial<XResponseData>) {
    if (data) this.setXData(data);
  }

  // ---------------------------------------------------------------------------
  // Factories
  // ---------------------------------------------------------------------------

  static create(data?: Partial<XResponseData>) {
    return new XResponse(data);
  }

  static ok(result: any): XResponse {
    return new XResponse({ _ok: true, _result: result });
  }

  static error(error: any): XResponse {
    // Normalize XError
    if (error instanceof XError) {
      return new XResponse({
        _ok: false,
        _result: error.toXData(),
      });
    }

    // Normalize unknown errors
    const xe = new XError(
      "E_INTERNAL",
      error?.message ?? String(error),
      { _cause: error }
    );

    return new XResponse({
      _ok: false,
      _result: xe.toXData(),
    });
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  stopProcessTimeCounter(): void {
    this._pt = Date.now() - this._ts;
  }

  // ---------------------------------------------------------------------------
  // Protocol
  // ---------------------------------------------------------------------------

  /**
   * Convert to wire-safe object.
   * NOTE: serialize == finalize timing
   */
  toXData(): XResponseData {
    this.stopProcessTimeCounter();
    return {
      _ok: this._ok,
      _ts: this._ts,
      _pt: this._pt,
      _result: this._result,
    };
  }

  toString(): string {
    return JSON.stringify(this.toXData());
  }

  setXData(data: Partial<XResponseData>): void {
    if (!data) return;

    if ("_ok" in data) this._ok = Boolean(data._ok);
    if ("_ts" in data && typeof data._ts === "number") this._ts = data._ts;
    if ("_pt" in data && typeof data._pt === "number") this._pt = data._pt;
    if ("_result" in data) this._result = (data as any)._result;
  }
}



export class XResponseError extends XResponse {
  constructor(error: any) {
    super(XResponse.error(error).toXData());
  }
}

export class XResponseOK extends XResponse {
  constructor(result: any) {
    super({ _ok: true, _result: result });
  }
}
