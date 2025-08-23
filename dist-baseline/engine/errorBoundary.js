class ErrorRingBuffer {
    capacity;
    buf = [];
    constructor(capacity = 50) {
        this.capacity = capacity;
    }
    push(err) {
        const e = err instanceof Error ? err : new Error(String(err));
        this.buf.push({ time: Date.now(), message: e.message, stack: e.stack });
        if (this.buf.length > this.capacity)
            this.buf.shift();
    }
    list() { return [...this.buf]; }
    clear() { this.buf = []; }
}
export const errorBuffer = new ErrorRingBuffer();
export function safe(fn, fallback) {
    try {
        return fn();
    }
    catch (e) {
        errorBuffer.push(e);
        return fallback;
    }
}
