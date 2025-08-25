import { System, OrchestratorContext } from '../engine';
import { GameState } from '../state/gameState';

/** Integrates & expires pooled particles. */
export function createParticleSystem(state: GameState): System {
  return {
    id: 'particles', order: 2,
    update: (dt: number, _ctx: OrchestratorContext) => {
      const arr = state.particles;
      for (let i = 0; i < arr.length; i++) {
        const p = arr[i];
        if (!p.alive) continue;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.ttl -= dt;
        // Variant-based behavior (lightweight, deterministic friendly once RNG injection covers fx):
        if (p.variant === 'spark') {
          // Slight upward drift
          p.vy -= 5 * dt;
        } else if (p.variant === 'ember') {
          // Slow down over time
          p.vx *= (1 - 2*dt);
          p.vy *= (1 - 2*dt);
        }
        // Size fade for certain variants
        if (p.variant === 'spark' || p.variant === 'ember' || p.variant === 'burst' || p.variant === 'trail') {
          const t = Math.max(p.ttl, 0) / (p.initialTtl || 1);
          p.size = Math.max(0.5, p.size * 0.9);
          // Light alpha fade could be added in render by computing t
        }
        if (p.ttl <= 0) {
          p.alive = false;
          const last = arr[arr.length - 1];
            arr[i] = last; arr.pop(); i--;
          state.particlePool.release(p);
        }
      }
    }
  };
}
