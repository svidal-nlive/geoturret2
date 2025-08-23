export function createCollisionSystem(state) {
    return {
        id: 'collision', order: 10,
        update: (_dt, _ctx) => {
            for (const b of state.bullets)
                if (b.alive) {
                    for (const e of state.enemies)
                        if (e.alive) {
                            const dx = e.x - b.x;
                            const dy = e.y - b.y;
                            if (dx * dx + dy * dy < 12 * 12) {
                                e.alive = false;
                                b.alive = false;
                                state.kills++;
                                state.waveKills++;
                                break;
                            }
                        }
                }
            if (state.kills % 5 === 0) {
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
            }
        }
    };
}
