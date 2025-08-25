import { eventBus } from '../engine/index.js';
export function createCollisionSystem(state) {
    return {
        id: 'collision', order: 10,
        update: (_dt, _ctx) => {
            const debugPhases = process.env.PERF_DEBUG_PHASES;
            let t0;
            let pairs = 0;
            let kills = 0;
            if (debugPhases)
                t0 = performance.now();
            for (const b of state.bullets)
                if (b.alive) {
                    const R = 12;
                    const R2 = R * R;
                    for (const e of state.enemies)
                        if (e.alive) {
                            const dx = e.x - b.x;
                            const dy = e.y - b.y;
                            if (dx * dx + dy * dy < R2) {
                                e.alive = false;
                                b.alive = false;
                                state.kills++;
                                state.waveKills++;
                                kills++;
                                eventBus.emit('kill', { enemyId: e.id });
                                break;
                            }
                            if (debugPhases)
                                pairs++;
                        }
                }
            if (state.kills % 5 === 0) {
                const cleanStart = debugPhases ? performance.now() : 0;
                for (let i = state.enemies.length - 1; i >= 0; i--) {
                    const e = state.enemies[i];
                    if (!e.alive) {
                        state.enemies.splice(i, 1);
                        state.enemyPool.release(e);
                    }
                }
                for (let i = state.bullets.length - 1; i >= 0; i--) {
                    const b = state.bullets[i];
                    if (!b.alive || Math.abs(b.x) > 400 || Math.abs(b.y) > 400) {
                        state.bullets.splice(i, 1);
                        state.bulletPool.release(b);
                    }
                }
                if (debugPhases && t0 !== undefined) {
                    const now = performance.now();
                    const total = now - t0;
                    const cleanMs = now - cleanStart;
                    let poolInfo = '';
                    if (process.env.PERF_DEBUG_POOLS) {
                        const es = state.enemyPool.stats();
                        const bs = state.bulletPool.stats();
                        poolInfo = ` ePoolSize=${es.size} eFree=${es.free} bPoolSize=${bs.size} bFree=${bs.free}`;
                    }
                    console.log(`PERF_COLLISION total=${total.toFixed(4)} pairs=${pairs} kills=${kills} cleanup=${cleanMs.toFixed(4)}${poolInfo}`);
                }
            }
        }
    };
}
