import { GameOrchestrator } from '../engine/orchestrator.js';
import { createGameState } from '../state/gameState.js';
import { createPlayerSystem } from '../systems/playerSystem.js';
import { createBulletSystem } from '../systems/bulletSystem.js';
import { createEnemySystem } from '../systems/enemySystem.js';
import { createCollisionSystem } from '../systems/collisionSystem.js';
import { Pool } from '../engine/pool.js';
export function createPooledHarness(kind, seed, poolSize = 2, opts) {
    const orchestrator = new GameOrchestrator({ seed, fixedStep: 1 / 60 });
    const state = createGameState();
    if (kind === 'bullet') {
        state.bulletPool = new Pool({
            initial: poolSize,
            create: () => ({ id: 0, x: 0, y: 0, vx: 0, vy: 0, alive: false }),
            reset: b => { b.alive = false; }
        });
    }
    else {
        state.enemyPool = new Pool({
            initial: poolSize,
            create: () => ({ id: 0, x: 0, y: 0, vx: 0, vy: 0, hp: 0, alive: false }),
            reset: e => { e.alive = false; }
        });
    }
    orchestrator.register(createPlayerSystem(state));
    if (kind === 'bullet')
        orchestrator.register(createBulletSystem(state));
    else
        orchestrator.register(createEnemySystem(state));
    orchestrator.register(createCollisionSystem(state));
    orchestrator.init();
    if (opts?.profiler)
        orchestrator.enableProfiler(true);
    const step = orchestrator.getStep();
    function spawnUntil(count) {
        const list = kind === 'bullet' ? state.bullets : state.enemies;
        while (list.length < count)
            orchestrator.advance(step);
    }
    function reclaimAll() {
        if (kind === 'bullet') {
            for (const b of state.bullets)
                b.alive = false;
        }
        else {
            for (const e of state.enemies)
                e.alive = false;
        }
        state.kills = 5;
        orchestrator.advance(step);
    }
    function getEntities() { return kind === 'bullet' ? state.bullets : state.enemies; }
    function getPool() { return (kind === 'bullet' ? state.bulletPool : state.enemyPool); }
    function profile(frameCount, opts) {
        orchestrator.enableProfiler(true);
        const agg = { perSystem: {}, frames: 0 };
        const memStart = opts?.memory && typeof process !== 'undefined' && process.memoryUsage ? process.memoryUsage().heapUsed : 0;
        let lastHeap = memStart;
        for (let i = 0; i < frameCount; i++) {
            orchestrator.advance(step);
            const p = orchestrator.getMetrics().profiling;
            if (p) {
                for (const [id, ms] of Object.entries(p)) {
                    const rec = agg.perSystem[id] || (agg.perSystem[id] = { totalMs: 0, frames: 0, avgMs: 0, minMs: Number.POSITIVE_INFINITY, maxMs: 0 });
                    rec.totalMs += ms;
                    rec.frames += 1;
                    if (ms < rec.minMs)
                        rec.minMs = ms;
                    if (ms > rec.maxMs)
                        rec.maxMs = ms;
                }
            }
            if (opts?.memory && typeof process !== 'undefined' && process.memoryUsage) {
                lastHeap = process.memoryUsage().heapUsed;
            }
            agg.frames++;
        }
        for (const rec of Object.values(agg.perSystem)) {
            rec.avgMs = rec.totalMs / rec.frames;
            if (rec.minMs === Number.POSITIVE_INFINITY)
                rec.minMs = 0;
        }
        if (opts?.memory) {
            const end = lastHeap;
            const delta = end - memStart;
            agg.memory = { startBytes: memStart, endBytes: end, deltaBytes: delta, avgDeltaPerFrame: delta / frameCount };
        }
        return agg;
    }
    return { orchestrator, step, spawnUntil, reclaimAll, getEntities: getEntities, getPool, profile, state };
}
