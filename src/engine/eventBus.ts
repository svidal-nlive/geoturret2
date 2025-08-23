/**
 * Lightweight event bus (Phase 1 P1-3).
 * String event names mapped to listener arrays. Minimal to keep perf predictable.
 */
export type EventHandler<T = unknown> = (payload: T) => void;

// Core event map (extend in future phases). Add new keys here for compile-time safety.
export interface CoreEventMap {
  frame: { frame: number; time: number };
  snapshot: { frame: number; time: number; registryHash: string; summary: { kills: number; wave: number } };
  waveStart: { wave: number; prevWave: number; target: number };
  error: { message: string; context?: any };
  perfSample: { frame: number; profiling: Record<string, number> };
  kill?: { enemyId: number };
  graze?: { enemyId: number; distance: number };
  overdriveStart?: { duration: number };
  overdriveEnd?: {};
}

type AnyEventMap = Record<string, any>;

class EventBus<M extends AnyEventMap> {
  private listeners: Map<keyof M & string, Set<EventHandler<any>>> = new Map();

  on<K extends keyof M & string>(event: K, handler: EventHandler<M[K]>): () => void;
  // Fallback for dynamic / future events
  on(event: string, handler: EventHandler<any>): () => void;
  on(event: string, handler: EventHandler<any>): () => void {
    let set = this.listeners.get(event as any);
    if (!set) { set = new Set(); this.listeners.set(event as any, set); }
    set.add(handler as EventHandler);
    return () => this.off(event, handler);
  }

  off<K extends keyof M & string>(event: K, handler: EventHandler<M[K]>): void;
  off(event: string, handler: EventHandler<any>): void;
  off(event: string, handler: EventHandler<any>): void {
    const set = this.listeners.get(event as any);
    if (set) {
      set.delete(handler as EventHandler);
      if (!set.size) this.listeners.delete(event as any);
    }
  }

  emit<K extends keyof M & string>(event: K, payload: M[K]): void;
  emit(event: string, payload: any): void;
  emit(event: string, payload: any): void {
    const set = this.listeners.get(event as any);
    if (!set) return;
    [...set].forEach(h => { try { h(payload); } catch {/* swallowed; boundary handles */} });
  }

  clear(): void { this.listeners.clear(); }
}

export const eventBus: EventBus<CoreEventMap> = new EventBus();

// Helper type exports for consumers
export type EventMap = CoreEventMap;
