
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
