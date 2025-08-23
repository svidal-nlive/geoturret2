import { System, OrchestratorContext } from '../engine';
import { GameState, Bullet } from '../state/gameState';
import { player } from './playerSystem';

export function createBulletSystem(state: GameState): System {
  return {
    id: 'bullets', order: 0,
    update: (dt, _ctx: OrchestratorContext) => {
      state.bulletTimer += dt;
  let fireInterval = 0.2; // 5 shots per second base
  if (state.overdriveActive) fireInterval *= 0.5; // double fire rate
      while (state.bulletTimer >= fireInterval) {
        state.bulletTimer -= fireInterval;
        const slot = state.bulletPool.acquire();
        if (!slot) break; // pool exhausted (rare for demo)
        const idx = state.nextBulletId;
        const angle = (idx % 60) * (Math.PI * 2 / 60);
        const speed = 140;
        slot.id = state.nextBulletId++;
        slot.x = player.x; slot.y = player.y;
        slot.vx = Math.cos(angle) * speed; slot.vy = Math.sin(angle) * speed;
        slot.alive = true;
        state.bullets.push(slot as Bullet);
      }
      // integrate bullets
      for (const b of state.bullets) if (b.alive) { b.x += b.vx * dt; b.y += b.vy * dt; }
    }
  };
}
