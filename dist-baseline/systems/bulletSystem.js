import { player } from './playerSystem.js';
const ANGLE_COUNT = 60;
const ANGLE_VECS = Array.from({ length: ANGLE_COUNT }, (_, i) => {
    const a = (i * Math.PI * 2) / ANGLE_COUNT;
    return { cx: Math.cos(a), sy: Math.sin(a) };
});
export function createBulletSystem(state) {
    return {
        id: 'bullets', order: 0,
        update: (dt, _ctx) => {
            const GOLDEN_MODE = !!process.env.GOLDEN_MODE;
            const debugPhases = process.env.PERF_DEBUG_PHASES;
            let tSpawnStart;
            let spawnCount = 0;
            let integrateStart;
            if (debugPhases)
                tSpawnStart = performance.now();
            state.bulletTimer += dt;
            let fireInterval;
            if (GOLDEN_MODE) {
                fireInterval = 0.2;
                if (state.overdriveActive)
                    fireInterval *= 0.5;
            }
            else {
                fireInterval = 0.2;
                if (state.overdriveActive)
                    fireInterval *= 0.5;
            }
            if (state.bulletTimer >= fireInterval) {
                let spawnN = Math.floor(state.bulletTimer / fireInterval);
                state.bulletTimer -= spawnN * fireInterval;
                const speed = 140;
                for (let i = 0; i < spawnN; i++) {
                    const slot = state.bulletPool.acquire();
                    if (!slot)
                        break;
                    const idx = state.nextBulletId++;
                    const v = ANGLE_VECS[idx % ANGLE_COUNT];
                    slot.id = idx;
                    slot.x = player.x;
                    slot.y = player.y;
                    slot.vx = v.cx * speed;
                    slot.vy = v.sy * speed;
                    slot.alive = true;
                    state.bullets.push(slot);
                    spawnCount++;
                }
            }
            if (debugPhases)
                integrateStart = performance.now();
            for (let i = 0; i < state.bullets.length; i++) {
                const b = state.bullets[i];
                if (!b.alive)
                    continue;
                b.x += b.vx * dt;
                b.y += b.vy * dt;
                if (state.bossHealth > 0) {
                    const hb = state.bossHitbox;
                    const dx = b.x - hb.x;
                    const dy = b.y - hb.y;
                    const r = hb.radius;
                    if (dx * dx + dy * dy <= r * r) {
                        const dmg = GOLDEN_MODE ? 12 : 12;
                        state.bossHealth = Math.max(0, state.bossHealth - dmg);
                        const log = state.bossDamageLog;
                        log.push({ frame: globalThis.__frame ?? 0, amount: dmg, source: 'playerBullet', hpAfter: state.bossHealth });
                        if (log.length > 100)
                            log.splice(0, log.length - 100);
                        b.alive = false;
                        const last = state.bullets[state.bullets.length - 1];
                        state.bullets[i] = last;
                        state.bullets.pop();
                        i--;
                        state.bulletPool.release(b);
                        continue;
                    }
                }
            }
            if (debugPhases && tSpawnStart !== undefined && integrateStart !== undefined) {
                const tEnd = performance.now();
                const spawnMs = integrateStart - tSpawnStart;
                const integrateMs = tEnd - integrateStart;
                let poolInfo = '';
                if (process.env.PERF_DEBUG_POOLS) {
                    const ps = state.bulletPool.stats();
                    poolInfo = ` poolSize=${ps.size} free=${ps.free} inUse=${ps.inUse} created=${ps.created}`;
                }
                console.log(`PERF_BULLETS spawn=${spawnMs.toFixed(4)} integrate=${integrateMs.toFixed(4)} active=${state.bullets.length} spawned=${spawnCount}${poolInfo}`);
            }
        }
    };
}
