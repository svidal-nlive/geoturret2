import { eventBus } from '../engine/index.js';
import { Registries } from '../content/registries.js';
export function createEnemySystem(state) {
    return {
        id: 'enemySpawn', order: -50,
        update: (dt, ctx) => {
            const GOLDEN_MODE = !!process.env.GOLDEN_MODE;
            state.enemySpawnTimer += dt;
            let interval;
            if (GOLDEN_MODE) {
                interval = (ctx.frame < 600 && state.kills < 10) ? 0.70 : 0.75;
            }
            else {
                interval = (ctx.frame < 600 && state.kills < 10) ? 0.70 : 0.75;
            }
            while (state.enemySpawnTimer >= interval) {
                state.enemySpawnTimer -= interval;
                const slot = state.enemyPool.acquire();
                if (!slot)
                    break;
                const angle = ctx.rng.next() * Math.PI * 2;
                const dist = 120 + ctx.rng.next() * 60;
                const speed = 20 + ctx.rng.next() * 20;
                slot.id = state.nextEnemyId++;
                const enemyIds = Registries.snapshot().enemies;
                if (enemyIds.length > 0) {
                    const pick = enemyIds[Math.floor(ctx.rng.next() * enemyIds.length)];
                    slot.defId = pick;
                    const def = Registries.getEnemy(pick);
                    slot.bounty = def?.bounty ?? 0;
                }
                else {
                    slot.defId = 'unknown';
                    slot.bounty = 0;
                }
                slot.bountyAwarded = false;
                slot.x = Math.cos(angle) * dist;
                slot.y = Math.sin(angle) * dist;
                slot.vx = -Math.cos(angle) * speed;
                slot.vy = -Math.sin(angle) * speed;
                slot.hp = 1;
                slot.alive = true;
                state.enemies.push(slot);
            }
            let useRadius;
            if (GOLDEN_MODE) {
                const baseRadius = 32;
                const earlyBoost = 42;
                useRadius = ((ctx.frame < 360 && state.wave === 0) || (ctx.frame < 600 && state.kills < 10)) ? earlyBoost : baseRadius;
                if (state.kills < 10 && ctx.frame >= 500 && ctx.frame < 600)
                    useRadius = 60;
            }
            else {
                const baseRadius = 32;
                const earlyBoost = 42;
                useRadius = ((ctx.frame < 360 && state.wave === 0) || (ctx.frame < 600 && state.kills < 10)) ? earlyBoost : baseRadius;
                if (state.kills < 10 && ctx.frame >= 500 && ctx.frame < 600)
                    useRadius = 60;
            }
            const CENTER_KILL_RADIUS2 = useRadius * useRadius;
            for (const e of state.enemies)
                if (e.alive) {
                    e.x += e.vx * dt;
                    e.y += e.vy * dt;
                    const dist2 = e.x * e.x + e.y * e.y;
                    if (e.hp <= 0) {
                        e.alive = false;
                        continue;
                    }
                    if (dist2 < CENTER_KILL_RADIUS2) {
                        e.alive = false;
                        state.kills++;
                        state.waveKills++;
                        eventBus.emit('kill', { enemyId: e.id, cause: 'center' });
                        if (e.defId) {
                            const def = Registries.getEnemy(e.defId);
                            let dmg = 10;
                            switch (def?.role) {
                                case 'fast':
                                    dmg = 8;
                                    break;
                                case 'tank':
                                    dmg = 20;
                                    break;
                                case 'elite':
                                    dmg = 25;
                                    break;
                                default:
                                    dmg = 10;
                                    break;
                            }
                            eventBus.emit('playerHit', { enemyId: e.id, defId: e.defId, amount: dmg, role: def?.role });
                        }
                        else {
                            eventBus.emit('playerHit', { enemyId: e.id, amount: 10 });
                        }
                        continue;
                    }
                }
        }
    };
}
