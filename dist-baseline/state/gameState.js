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
    const patternProjectilePool = new Pool({
        initial: 32,
        create: () => ({ id: 0, x: 0, y: 0, vx: 0, vy: 0, ttl: 0, alive: false }),
        reset: p => { p.alive = false; p.ttl = 0; }
    });
    const particlePool = new Pool({
        initial: 64,
        create: () => ({ id: 0, x: 0, y: 0, vx: 0, vy: 0, ttl: 0, initialTtl: 0, size: 2, color: '#fff', variant: 'generic', alive: false }),
        reset: p => { p.alive = false; p.ttl = 0; p.initialTtl = 0; p.variant = 'generic'; }
    });
    return {
        enemies: [], bullets: [], patternProjectiles: [], particles: [], enemyPool, bulletPool, patternProjectilePool, particlePool,
        kills: 0, wave: 0, waveKills: 0, waveTarget: 10, enemySpawnTimer: 0, bulletTimer: 0, nextEnemyId: 1, nextBulletId: 1,
        camera: { x: 0, y: 0, zoom: 1, targetZoom: 1, shakeRemaining: 0, shakeDuration: 0, shakeAmp: 0, shakeFreq: 25, shakeX: 0, shakeY: 0 },
        parallax: { layers: [] },
        grazeCount: 0, grazeThisWave: 0,
        overdriveMeter: 0, overdriveActive: false, overdriveTimeRemaining: 0,
        bossHealth: 1000, bossMaxHealth: 1000, bossHitbox: { x: 0, y: 0, radius: 32 },
        bossDamageLog: [], currentBossPatternId: null,
        safeLaneIndex: null,
        fairness: { exposures: 0, minSafeWidth: Infinity, recentHits: 0, cumulativeUnsafeTime: 0, adjustmentFactor: 1, _recentHitDecay: 0 },
        motionReduction: false,
        safeLaneHighlightIntensity: 1,
        theme: 'default',
        playerHealth: 150, playerMaxHealth: 150,
        playerArmor: 80, playerMaxArmor: 80,
        coins: 0,
        playerDead: false
    };
}
