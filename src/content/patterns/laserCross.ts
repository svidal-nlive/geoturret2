/**
 * Concrete boss pattern: laser-cross (Phase 1 minimal deterministic pattern).
 * Timeline (frames @60fps):
 *  0: start (orientation RNG pick: horizontal-first vs vertical-first)
 *  0-59: charge phase A
 *  60-119: fire phase A
 *  120-179: fire phase B (rotated)
 * Completes at frame 180 (3 seconds) returning true.
 * Currently this pattern does not spawn real projectiles – it is a deterministic
 * placeholder to exercise the boss pattern lifecycle & golden coverage without
 * perturbing existing enemy/bullet deterministic flows.
 */
import { BossPattern } from '../bossPattern';
import { OrchestratorContext } from '../../engine';
import { GameState } from '../../state/gameState';

export function createLaserCrossPattern(_state: GameState): BossPattern {
  let frame = 0;
  let orientationFirst: 'h'|'v' = 'h';
  return {
    id: 'laser-cross',
    version: 1,
    start(ctx: OrchestratorContext) {
      // Single deterministic RNG draw so replay reproducible
      orientationFirst = (ctx.rng.next() < 0.5) ? 'h' : 'v';
    },
    update(_dt: number, _ctx: OrchestratorContext) {
      frame++;
  // Placeholder only – leave laser-cross without extra spawns to keep existing golden stable.
      if (frame >= 180) return true;
      return false;
    },
    end(_ctx: OrchestratorContext) {
      // no-op for now
    }
  };
}
