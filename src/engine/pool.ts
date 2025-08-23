/**
 * Generic object pool (Phase 1 P1-4 scaffold) for transient entities: particles, projectiles, etc.
 * Lightweight: no dependency on specific object shape – factory + reset callbacks provided.
 */
export interface PoolStats { size: number; free: number; inUse: number; created: number; max?: number }

export interface PoolOptions<T> {
  /** Initial capacity to preallocate. */
  initial: number;
  /** Optional hard max capacity – further acquire beyond growth returns undefined. */
  max?: number;
  /** Factory to create a new instance when expanding. */
  create: () => T;
  /** Reset invoked on release before returning to free list. */
  reset?: (obj: T) => void;
}

export class Pool<T> {
  private free: T[] = [];
  private total = 0;
  private created = 0;
  private readonly max?: number;
  constructor(private opts: PoolOptions<T>) {
    this.max = opts.max;
    for (let i = 0; i < opts.initial; i++) this.free.push(this.make());
  }
  private make(): T { this.total++; this.created++; return this.opts.create(); }
  acquire(): T | undefined {
    if (this.free.length) return this.free.pop()!;
    if (this.max !== undefined && this.total >= this.max) return undefined;
    return this.make();
  }
  release(obj: T): void {
    this.opts.reset?.(obj);
    this.free.push(obj);
  }
  stats(): PoolStats { return { size: this.total, free: this.free.length, inUse: this.total - this.free.length, created: this.created, max: this.max }; }
  preallocate(n: number): void {
    for (let i = 0; i < n; i++) {
      if (this.max !== undefined && this.total >= this.max) break;
      this.free.push(this.make());
    }
  }
}
