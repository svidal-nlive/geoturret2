export function createEnemySystem(state) {
    return {
        id: 'enemySpawn', order: -50,
        update: (dt, ctx) => {
            state.enemySpawnTimer += dt;
            const interval = 0.75;
            while (state.enemySpawnTimer >= interval) {
                state.enemySpawnTimer -= interval;
                const slot = state.enemyPool.acquire();
                if (!slot)
                    break;
                const angle = ctx.rng.next() * Math.PI * 2;
                const dist = 120 + ctx.rng.next() * 60;
                const speed = 20 + ctx.rng.next() * 20;
                slot.id = state.nextEnemyId++;
                slot.x = Math.cos(angle) * dist;
                slot.y = Math.sin(angle) * dist;
                slot.vx = -Math.cos(angle) * speed;
                slot.vy = -Math.sin(angle) * speed;
                slot.hp = 1;
                slot.alive = true;
                state.enemies.push(slot);
            }
            for (const e of state.enemies)
                if (e.alive) {
                    e.x += e.vx * dt;
                    e.y += e.vy * dt;
                }
        }
    };
}
