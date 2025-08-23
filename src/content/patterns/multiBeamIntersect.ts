/**
 * Boss pattern: multi-beam-intersect
 * Timeline (frames @60fps):
 * 0-59   : charge beams (RNG picks rotation direction)
 * 60-179 : rotate beams phase 1
 * 180-299: rotate beams phase 2 (reverse direction)
 * Completes at frame 300.
 * Placeholder effect only for deterministic lifecycle test.
 */
import { BossPattern } from '../bossPattern';
import { OrchestratorContext } from '../../engine';
import { GameState } from '../../state/gameState';

export function createMultiBeamIntersectPattern(state: GameState): BossPattern {
  let frame = 0;
  let rotateDir = 1;
  return {
    id: 'multi-beam-intersect',
    version: 1,
    start(ctx: OrchestratorContext) {
      rotateDir = ctx.rng.next() < 0.5 ? 1 : -1; // RNG draw
    },
    update(_dt, ctx: OrchestratorContext) {
      frame++;
      // Spawn an orbiting enemy every 40 frames during rotate phases (60..299)
      if (frame >= 60 && frame < 300 && frame % 40 === 0) {
        const slot = state.enemyPool.acquire();
        if (slot) {
          const t = frame / 60;
            const radius = 160 + (ctx.rng.next() * 30);
          const angle = (t * rotateDir * Math.PI/2);
          slot.id = state.nextEnemyId++;
          slot.x = Math.cos(angle) * radius;
          slot.y = Math.sin(angle) * radius;
          slot.vx = -Math.cos(angle) * 20;
          slot.vy = -Math.sin(angle) * 20;
          slot.hp = 1; slot.alive = true;
          (state.enemies as any).push(slot);
        }
      }
      if (frame >= 300) return true;
      return false;
    },
    end() { /* no-op */ }
  };
}
