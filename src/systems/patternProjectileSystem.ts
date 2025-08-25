import { System, OrchestratorContext } from '../engine';
import { GameState, PatternProjectile } from '../state/gameState';

/** Integrates pooled pattern projectiles with TTL & culling. */
export function createPatternProjectileSystem(state: GameState): System {
  return {
    id: 'patternProjectiles', order: 1,
    update: (dt: number, _ctx: OrchestratorContext) => {
      const arr = state.patternProjectiles;
      for (let i = 0; i < arr.length; i++) {
        const p = arr[i];
        if (!p.alive) continue;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.ttl -= dt;
        // Boss hitbox collision (circle) damage model
    if (state.bossHealth > 0) {
          const hb = state.bossHitbox;
          const dx = p.x - hb.x; const dy = p.y - hb.y; const r = hb.radius;
          if (dx*dx + dy*dy <= r*r) {
            const dmg = Math.max(5, Math.min(40, Math.round((Math.abs(p.vx)+Math.abs(p.vy))*0.2)));
      state.bossHealth = Math.max(0, state.bossHealth - dmg);
      // Damage log ring buffer (keep last 100)
      const log = state.bossDamageLog;
      log.push({ frame: (globalThis as any).__frame ?? 0, amount: dmg, source: 'patternProjectile', hpAfter: state.bossHealth });
      if (log.length > 100) log.splice(0, log.length - 100);
            p.alive = false;
            const last = arr[arr.length - 1]; arr[i] = last; arr.pop(); i--;
            state.patternProjectilePool.release(p);
            continue;
          }
        }
        if (p.ttl <= 0 || Math.abs(p.x) > 800 || Math.abs(p.y) > 800) {
          p.alive = false;
          // compact removal: swap with end and pop
          const last = arr[arr.length - 1];
          arr[i] = last; arr.pop(); i--;
          state.patternProjectilePool.release(p);
        }
      }
    }
  };
}
