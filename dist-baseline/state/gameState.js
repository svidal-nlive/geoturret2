import { Pool } from '../engine/pool.js';
export function createGameState() {
    const enemyPool = new Pool({
        initial: 32,
        create: () => ({ id: 0, x: 0, y: 0, vx: 0, vy: 0, hp: 0, alive: false }),
        reset: e => { e.alive = false; }
    });
    const bulletPool = new Pool({
        initial: 64,
        create: () => ({ id: 0, x: 0, y: 0, vx: 0, vy: 0, alive: false }),
        reset: b => { b.alive = false; }
    });
    return { enemies: [], bullets: [], enemyPool, bulletPool, kills: 0, wave: 0, waveKills: 0, waveTarget: 10, enemySpawnTimer: 0, bulletTimer: 0, nextEnemyId: 1, nextBulletId: 1 };
}
