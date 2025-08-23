import { GameOrchestrator } from '../engine/orchestrator';
import { createGameState, Bullet, Enemy } from '../state/gameState';
import { createPlayerSystem } from '../systems/playerSystem';
import { createBulletSystem } from '../systems/bulletSystem';
import { createEnemySystem } from '../systems/enemySystem';
import { createCollisionSystem } from '../systems/collisionSystem';
import { Pool } from '../engine/pool';

// Minimal ambient declaration to allow optional memory sampling without pulling in full Node types.
declare const process: any | undefined; // intentional any: optional process memory reading

export type PooledKind = 'bullet' | 'enemy';

export interface PooledEntityHarness<K extends PooledKind> {
  orchestrator: GameOrchestrator;
  step: number;
  spawnUntil(count: number): void;
  reclaimAll(): void;
  getEntities(): (K extends 'bullet' ? Bullet : Enemy)[];
  getPool(): Pool<any>;
  /** Run one tick at a time collecting profiler samples (enables profiler automatically). */
  profile(frameCount: number, opts?: { memory?: boolean }): ProfilingAggregate;
  state: ReturnType<typeof createGameState>;
}

export interface ProfilingAggregate {
  perSystem: Record<string, { totalMs: number; frames: number; avgMs: number; minMs: number; maxMs: number }>;
  frames: number;
  memory?: { startBytes: number; endBytes: number; deltaBytes: number; avgDeltaPerFrame: number };
}

/** Create a deterministic harness for testing pooled entity reuse. */
export function createPooledHarness<K extends PooledKind>(kind: K, seed: string, poolSize = 2, opts?: { profiler?: boolean }): PooledEntityHarness<K> {
  const orchestrator = new GameOrchestrator({ seed, fixedStep: 1/60 });
  const state = createGameState();
  if (kind === 'bullet') {
    state.bulletPool = new Pool<Bullet>({
      initial: poolSize,
      create: () => ({ id: 0, x: 0, y: 0, vx: 0, vy: 0, alive: false }),
      reset: b => { b.alive = false; }
    });
  } else {
    state.enemyPool = new Pool<Enemy>({
      initial: poolSize,
      create: () => ({ id: 0, x: 0, y: 0, vx: 0, vy: 0, hp: 0, alive: false }),
      reset: e => { e.alive = false; }
    });
  }
  orchestrator.register(createPlayerSystem(state));
  if (kind === 'bullet') orchestrator.register(createBulletSystem(state));
  else orchestrator.register(createEnemySystem(state));
  orchestrator.register(createCollisionSystem(state));
  orchestrator.init();
  if (opts?.profiler) orchestrator.enableProfiler(true);

  const step = orchestrator.getStep();

  function spawnUntil(count: number) {
    const list = kind === 'bullet' ? state.bullets : state.enemies;
    while (list.length < count) orchestrator.advance(step);
  }

  function reclaimAll() {
    if (kind === 'bullet') {
      for (const b of state.bullets) b.alive = false;
    } else {
      for (const e of state.enemies) e.alive = false;
    }
    // Ensure cleanup heuristic executes (kills % 5 === 0)
    (state as any).kills = 5;
    orchestrator.advance(step);
  }

  function getEntities(): any[] { return kind === 'bullet' ? state.bullets : state.enemies; }
  function getPool(): Pool<any> { return (kind === 'bullet' ? state.bulletPool : state.enemyPool) as Pool<any>; }

  function profile(frameCount: number, opts?: { memory?: boolean }): ProfilingAggregate {
    orchestrator.enableProfiler(true);
    const agg: ProfilingAggregate = { perSystem: {}, frames: 0 };
    const memStart = opts?.memory && typeof process !== 'undefined' && process.memoryUsage ? process.memoryUsage().heapUsed : 0;
    let lastHeap = memStart;
    for (let i = 0; i < frameCount; i++) {
      orchestrator.advance(step); // one fixed step
      const p = orchestrator.getMetrics().profiling;
      if (p) {
        for (const [id, ms] of Object.entries(p)) {
          const rec = agg.perSystem[id] || (agg.perSystem[id] = { totalMs: 0, frames: 0, avgMs: 0, minMs: Number.POSITIVE_INFINITY, maxMs: 0 });
          rec.totalMs += ms; rec.frames += 1;
          if (ms < rec.minMs) rec.minMs = ms;
          if (ms > rec.maxMs) rec.maxMs = ms;
        }
      }
      if (opts?.memory && typeof process !== 'undefined' && process.memoryUsage) {
        lastHeap = process.memoryUsage().heapUsed;
      }
      agg.frames++;
    }
    for (const rec of Object.values(agg.perSystem)) {
      rec.avgMs = rec.totalMs / rec.frames;
      if (rec.minMs === Number.POSITIVE_INFINITY) rec.minMs = 0;
    }
    if (opts?.memory) {
      const end = lastHeap;
      const delta = end - memStart;
      agg.memory = { startBytes: memStart, endBytes: end, deltaBytes: delta, avgDeltaPerFrame: delta / frameCount };
    }
    return agg;
  }

  return { orchestrator, step, spawnUntil, reclaimAll, getEntities: getEntities as any, getPool, profile, state };
}
