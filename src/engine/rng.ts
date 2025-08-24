/**
 * Deterministic RNG wrapper (Phase 1 task P1-12).
 * Linear Congruential Generator parameters chosen for 32-bit speed & reproducibility.
 * Not cryptographically secure.
 */
export class RNG {
  private state: number;
  private _draws = 0;
  static enableCounting = !!process.env.RNG_DRAW_COUNT_MODE;
  get draws() { return this._draws; }
  constructor(seed: number | string) {
    if (typeof seed === 'string') {
      // simple string hash (djb2)
      let h = 5381;
      for (let i = 0; i < seed.length; i++) {
        h = ((h << 5) + h) ^ seed.charCodeAt(i);
      }
      this.state = h >>> 0;
    } else {
      this.state = seed >>> 0;
    }
    if (this.state === 0) this.state = 0x1; // avoid zero lock
  }
  /** Float in [0,1) */
  next(): number {
    // LCG (Numerical Recipes): x = (1664525*x + 1013904223) mod 2^32
    this.state = (1664525 * this.state + 1013904223) >>> 0;
  if (RNG.enableCounting) this._draws++;
    return this.state / 0x100000000; // 2^32
  }
  /** Int in [min, max] inclusive */
  int(min: number, max: number): number {
    if (max < min) throw new Error('RNG.int: max < min');
    const span = max - min + 1;
    return min + Math.floor(this.next() * span);
  }
  /** Pick one element deterministically */
  choice<T>(arr: readonly T[]): T {
    if (!arr.length) throw new Error('RNG.choice: empty array');
    return arr[this.int(0, arr.length - 1)];
  }
  /** Serialize current state */
  snapshot(): number { return this.state; }
  /** Restore state */
  restore(state: number): void { this.state = state >>> 0 || 0x1; }
}

// Convenience singleton for early prototyping (will be replaced by injected instances):
export const globalRng = new RNG('geoturret2-seed');
