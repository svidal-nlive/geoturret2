/**
 * Boss pattern: safe-lane-volley
 * Timeline (frames @60fps):
 * 0-59   : telegraph lanes (deterministic RNG chooses which lane is safe first)
 * 60-179 : volley phase A
 * 180-239: volley phase B (lane swap)
 * Completes at frame 240.
 * Placeholder – no real projectile emission yet (keeps determinism isolated).
 */
import { BossPattern } from '../bossPattern';
import { OrchestratorContext } from '../../engine';
import { GameState } from '../../state/gameState';

export function createSafeLaneVolleyPattern(state: GameState): BossPattern {
  let frame = 0;
  let firstSafeLane = 0; // 0 or 1 chosen deterministically
  // Two lanes at y = -80 and y = 80; spawn enemies in hazardous lane during volley phases
  return {
    id: 'safe-lane-volley',
    version: 1,
    start(ctx: OrchestratorContext) {
      firstSafeLane = ctx.rng.next() < 0.5 ? 0 : 1; // one RNG draw
    },
    update(_dt, ctx: OrchestratorContext) {
      frame++;
      // Volley phases frames 60..239
      if (frame >= 60 && frame < 240 && frame % 30 === 0) {
        const lanePhase = frame < 180 ? 0 : 1;
        const safeLane = lanePhase === 0 ? firstSafeLane : (firstSafeLane ^ 1);
        const hazardousLane = safeLane ^ 1;
        // Spawn a grunt enemy in hazardous lane at x determined by RNG for determinism
        const slot = state.enemyPool.acquire();
        if (slot) {
          const dist = 140 + ctx.rng.next() * 40;
          const angleBase = hazardousLane === 0 ? -Math.PI/2 : Math.PI/2; // upward/downward
          slot.id = state.nextEnemyId++;
          slot.x = Math.cos(angleBase) * dist;
          slot.y = Math.sin(angleBase) * dist;
          slot.vx = -Math.cos(angleBase) * 25;
          slot.vy = -Math.sin(angleBase) * 25;
          slot.hp = 1; slot.alive = true;
          (state.enemies as any).push(slot);
        }
      }
      if (frame >= 240) return true;
      return false;
    },
    end() { /* no-op */ }
  };
}
