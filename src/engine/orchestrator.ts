/**
 * GameOrchestrator (Phase 1) – central lifecycle coordinator.
 * Fixed-step accumulator model to ensure deterministic updates across devices.
 * Rendering layer will hook in later; currently only logical systems update.
 */
import { eventBus } from './eventBus';
import { RNG } from './rng';
import { createSnapshot, RunSnapshotMeta } from '../state/serialization';
import type { GameState } from '../state/gameState';

export interface OrchestratorContext {
  readonly frame: number;
  readonly time: number; // accumulated simulated seconds
  readonly rng: RNG;
  emit: typeof eventBus.emit;
  on: typeof eventBus.on;
}

export interface System {
  id: string;
  /** Lower order runs earlier; default 0. Tie -> insertion order */
  order?: number;
  init?(ctx: OrchestratorContext): void;
  update(dt: number, ctx: OrchestratorContext): void;
  teardown?(ctx: OrchestratorContext): void;
}

export interface OrchestratorMetrics {
  frame: number;
  time: number;
  systems: number;
  stepsLastAdvance: number;
  accumulator: number;
  profiling?: Record<string, number>; // ms per system last frame
}

export class GameOrchestrator {
  private systems: System[] = [];
  private frame = 0;
  private time = 0; // simulated seconds
  private accumulator = 0;
  private readonly step: number;
  private readonly rng: RNG;
  private profilerEnabled = false;
  private lastProfile: Record<string, number> | undefined;
  private summarySource?: () => Pick<GameState,'kills'|'wave'|'grazeCount'|'overdriveMeter'|'overdriveActive'>;

  constructor(opts?: { fixedStep?: number; seed?: number | string | RNG; summarySource?: () => Pick<GameState,'kills'|'wave'|'grazeCount'|'overdriveMeter'|'overdriveActive'> }) {
    this.step = opts?.fixedStep ?? (1 / 60);
  if (opts?.seed instanceof RNG) this.rng = opts.seed;
  else if (typeof opts?.seed !== 'undefined') this.rng = new RNG(opts.seed as any);
  else throw new Error('Orchestrator requires explicit seed (number|string|RNG) for determinism.');
  this.summarySource = opts?.summarySource;
  }

  register(system: System): void {
    if (this.systems.find(s => s.id === system.id)) throw new Error(`System id already registered: ${system.id}`);
    this.systems.push(system);
    this.sortSystems();
  }

  private sortSystems() {
    this.systems.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  init(): void {
    const ctx = this.buildContext();
    for (const s of this.systems) s.init?.(ctx);
  }

  /**
   * Advance simulation by elapsed real seconds (can be fractional). Returns number of fixed steps processed.
   */
  advance(elapsed: number): number {
    this.accumulator += elapsed;
    let steps = 0;
    while (this.accumulator + 1e-12 >= this.step) { // tiny epsilon to mitigate float drift
      this.accumulator -= this.step;
      this.tick();
      steps++;
    }
    return steps;
  }

  private tick() {
    const ctx = this.buildContext();
    if (this.profilerEnabled) {
      this.lastProfile = {};
      for (const s of this.systems) {
        const start = performance.now();
        s.update(this.step, ctx);
        this.lastProfile[s.id] = performance.now() - start;
      }
  eventBus.emit('perfSample', { frame: this.frame, profiling: this.lastProfile });
    } else {
      for (const s of this.systems) s.update(this.step, ctx);
    }
    this.frame++;
    this.time += this.step;
    eventBus.emit('frame', { frame: this.frame, time: this.time });
  }

  private buildContext(): OrchestratorContext {
    return {
      frame: this.frame,
      time: this.time,
      rng: this.rng,
      emit: eventBus.emit.bind(eventBus),
      on: eventBus.on.bind(eventBus)
    };
  }

  teardown(): void {
    const ctx = this.buildContext();
    for (const s of [...this.systems].reverse()) s.teardown?.(ctx);
    // Note: eventBus cleared externally when resetting environment.
  }

  getMetrics(): OrchestratorMetrics {
    return { frame: this.frame, time: this.time, systems: this.systems.length, stepsLastAdvance: 0, accumulator: this.accumulator, profiling: this.lastProfile };
  }

  getStep(): number { return this.step; }

  enableProfiler(flag = true): void { this.profilerEnabled = flag; }

  /** Export a deterministic run snapshot (frame/time/RNG + registries). */
  snapshot(): RunSnapshotMeta {
  const snap = createSnapshot({ frame: this.frame, time: this.time, rng: this.rng, state: this.summarySource?.() });
  eventBus.emit('snapshot', { frame: snap.frame, time: snap.time, registryHash: snap.registryHash, summary: snap.summary });
  return snap;
  }

  /** Restore orchestrator temporal + RNG state from snapshot. Systems/state must be separately restored. */
  restore(meta: Pick<RunSnapshotMeta,'frame'|'time'|'rngState'>): void {
    // Set frame/time directly; accumulator cleared so next advance continues cleanly.
    this.frame = meta.frame;
    this.time = meta.time;
    this.accumulator = 0;
    if ((this.rng as any).restore) (this.rng as any).restore(meta.rngState);
  }
}
