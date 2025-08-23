/** Error boundary ring buffer (Phase 1 P1-13). */
export interface CapturedError { time: number; message: string; stack?: string; }

class ErrorRingBuffer {
  private buf: CapturedError[] = [];
  constructor(private capacity = 50) {}
  push(err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    this.buf.push({ time: Date.now(), message: e.message, stack: e.stack });
    if (this.buf.length > this.capacity) this.buf.shift();
  }
  list(): CapturedError[] { return [...this.buf]; }
  clear() { this.buf = []; }
}

export const errorBuffer = new ErrorRingBuffer();

export function safe<T>(fn: () => T, fallback?: T): T | undefined {
  try { return fn(); } catch (e) { errorBuffer.push(e); return fallback; }
}
