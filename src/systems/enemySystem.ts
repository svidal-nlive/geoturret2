import { System, OrchestratorContext } from '../engine';
import { GameState, Enemy } from '../state/gameState';

export function createEnemySystem(state: GameState): System {
  return {
    id: 'enemySpawn', order: -50,
    update: (dt, ctx: OrchestratorContext) => {
      state.enemySpawnTimer += dt;
      // spawn every 0.75s
      const interval = 0.75;
      while (state.enemySpawnTimer >= interval) {
        state.enemySpawnTimer -= interval;
        const slot = state.enemyPool.acquire();
        if (!slot) break; // pool exhausted (future: metrics / backpressure)
        const angle = ctx.rng.next() * Math.PI * 2;
        const dist = 120 + ctx.rng.next() * 60; // spawn ring
        const speed = 20 + ctx.rng.next() * 20; // units per second
        slot.id = state.nextEnemyId++;
        slot.x = Math.cos(angle) * dist;
        slot.y = Math.sin(angle) * dist;
        slot.vx = -Math.cos(angle) * speed; // head roughly toward center
        slot.vy = -Math.sin(angle) * speed;
        slot.hp = 1;
        slot.alive = true;
        state.enemies.push(slot as Enemy);
      }
      // move enemies (in-place; dead entries retained until cleanup pass)
      for (const e of state.enemies) if (e.alive) { e.x += e.vx * dt; e.y += e.vy * dt; }
    }
  };
}
