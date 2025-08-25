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
  // Fairness adaptation: use adjustmentFactor (>1 => ease pattern) to extend telegraph and reduce volley density.
  const adj = state.fairness.adjustmentFactor || 1;
  const TELEGRAPH_END = Math.round(60 * Math.min(1.6, adj)); // extend up to +60% when factor high
  const TOTAL_FRAMES = 240 + Math.round((adj-1) * 30); // slightly lengthen total timeline giving more gaps
  const LANE_HEIGHT = 200; // world units (matches render overlay rectangles)
  const ARENA_HEIGHT = 400; // total vertical coverage (-200..+200)
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
  // Spawn cadence slowed when adjustment factor >1 (increase modulo interval)
  const baseInterval = 30;
  const interval = Math.round(baseInterval * Math.min(2, 1 + (adj-1)*0.6));
  if (frame >= TELEGRAPH_END && frame < TOTAL_FRAMES && frame % interval === 0) {
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
          const speedScale = 1 / Math.min(1.5, 1 + (adj-1)*0.5); // >1 adj => slower enemies up to -33%
          slot.vx = -Math.cos(angleBase) * 25 * speedScale;
          slot.vy = -Math.sin(angleBase) * 25 * speedScale;
          slot.hp = 1; slot.alive = true;
          (state.enemies as any).push(slot);
        }
      }
      if (frame >= TOTAL_FRAMES) return true;
      return false;
    },
  serializeState() {
    const lanePhase = frame < 180 ? 0 : 1;
  const telegraph = frame < TELEGRAPH_END;
    const activeSafe = telegraph ? firstSafeLane : (lanePhase === 0 ? firstSafeLane : (firstSafeLane ^ 1));
    return {
      frame,
      safeLane: activeSafe,
      telegraph,
  telegraphRemaining: telegraph ? (TELEGRAPH_END - frame) : 0,
  fairnessAdj: adj,
      laneCount: 2,
      laneHeight: LANE_HEIGHT,
      arenaHeight: ARENA_HEIGHT,
      laneNormalizedWidth: LANE_HEIGHT / ARENA_HEIGHT // 0.5 for two equal lanes
    };
  },
  end() { /* no-op */ }
  };
}
