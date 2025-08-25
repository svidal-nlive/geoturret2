/**
 * Boss pattern: future-converge (implemented for g8-boss-future seed)
 * Concept: radial spawn waves that converge toward center, then a convergence pulse.
 * Timeline (frames @60fps):
 * 0-59    : charge (no spawns)
 * 60-179  : radial wave A (every 30 frames spawn 6 enemies in circle moving inward)
 * 180-299 : radial wave B (offset angle)
 * 300-329 : convergence pulse (spawn a ring that quickly collapses)
 * Complete at frame 330 (5.5s).
 * Determinism: fixed spawn cadence + single RNG angle offset draws at phase starts.
 */
import { BossPattern } from '../bossPattern';
import { OrchestratorContext } from '../../engine';
import { GameState } from '../../state/gameState';

export function createFutureConvergePattern(state: GameState): BossPattern {
  let frame = 0;
  let baseAngleA = 0;
  let baseAngleB = 0;
  let pulseAngle = 0;
  const adj = state.fairness.adjustmentFactor || 1; // >1 => ease pattern
  function spawnRadial(ctx: OrchestratorContext, count: number, radius: number, speed: number, base: number) {
    for (let i=0;i<count;i++) {
      const slot = state.enemyPool.acquire();
      if (!slot) break;
      const ang = base + i * (Math.PI * 2 / count);
      slot.id = state.nextEnemyId++;
      slot.x = Math.cos(ang) * radius;
      slot.y = Math.sin(ang) * radius;
      slot.vx = -Math.cos(ang) * speed;
      slot.vy = -Math.sin(ang) * speed;
      slot.hp = 1; slot.alive = true;
      (state.enemies as any).push(slot);
    }
  }
  return {
    id: 'future-converge',
    version: 1,
    start(ctx) {
      baseAngleA = ctx.rng.next() * Math.PI * 2; // RNG draw 1
      baseAngleB = ctx.rng.next() * Math.PI * 2; // RNG draw 2
      pulseAngle = ctx.rng.next() * Math.PI * 2; // RNG draw 3
    },
    update(_dt, ctx) {
      frame++;
      // Phase A radial waves
      const aInterval = Math.round(30 * Math.min(2, 1 + (adj-1)*0.5));
      if (frame >= 60 && frame < 180 && frame % aInterval === 0) {
        const countScale = 1 / Math.min(1.5, 1 + (adj-1)*0.4); // reduce count up to ~33%
        const count = Math.max(3, Math.round(6 * countScale));
        const speed = 40 * (1 / Math.min(1.3, 1 + (adj-1)*0.4));
        spawnRadial(ctx, count, 200, speed, baseAngleA + (frame/aInterval)*0.15);
      }
      // Phase B radial waves (different base angle / slower convergence speed)
      const bInterval = Math.round(30 * Math.min(2, 1 + (adj-1)*0.5));
      if (frame >= 180 && frame < 300 && frame % bInterval === 0) {
        const countScaleB = 1 / Math.min(1.5, 1 + (adj-1)*0.45);
        const countB = Math.max(4, Math.round(8 * countScaleB));
        const speedB = 30 * (1 / Math.min(1.3, 1 + (adj-1)*0.4));
        spawnRadial(ctx, countB, 220, speedB, baseAngleB - (frame/bInterval)*0.12);
      }
      // Convergence pulse: one-time ring spawns at 300 and 315 collapsing faster
      const pulseCountScale = 1 / Math.min(1.4, 1 + (adj-1)*0.5);
      const pCount = Math.max(6, Math.round(12 * pulseCountScale));
      const baseSpeed = frame === 300 ? 55 : 65;
      const speedScale = 1 / Math.min(1.25, 1 + (adj-1)*0.4);
      if (frame === 300 || frame === 315) {
        spawnRadial(ctx, pCount, frame === 300 ? 250 : 180, baseSpeed * speedScale, pulseAngle + (frame===315?0.1:0));
      }
      if (frame >= 330) return true;
      return false;
    },
    end() { /* no-op */ }
  };
}
