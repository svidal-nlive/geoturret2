import { player } from './playerSystem.js';
export function createBulletSystem(state) {
    return {
        id: 'bullets', order: 0,
        update: (dt, _ctx) => {
            state.bulletTimer += dt;
            const fireInterval = 0.2;
            while (state.bulletTimer >= fireInterval) {
                state.bulletTimer -= fireInterval;
                const slot = state.bulletPool.acquire();
                if (!slot)
                    break;
                const idx = state.nextBulletId;
                const angle = (idx % 60) * (Math.PI * 2 / 60);
                const speed = 140;
                slot.id = state.nextBulletId++;
                slot.x = player.x;
                slot.y = player.y;
                slot.vx = Math.cos(angle) * speed;
                slot.vy = Math.sin(angle) * speed;
                slot.alive = true;
                state.bullets.push(slot);
            }
            for (const b of state.bullets)
                if (b.alive) {
                    b.x += b.vx * dt;
                    b.y += b.vy * dt;
                }
        }
    };
}
