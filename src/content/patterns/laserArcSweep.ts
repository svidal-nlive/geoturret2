/**
 * Boss pattern: laser-arc-sweep
 * Follows pre-laser-arc-preview. Consumes stored arc (angle/span) if present in prior pattern state.
 * Telegraph (short) -> firing sweep that damages player if outside safe arc.
 */
import { BossPattern } from '../bossPattern';
import { OrchestratorContext } from '../../engine';
import { GameState } from '../../state/gameState';

export function createLaserArcSweepPattern(state: GameState, opts?: { inheritedArc?: { angle: number; span: number; radius: number } }): BossPattern {
  let frame = 0;
  const adj = state.fairness.adjustmentFactor || 1;
  // If inherited arc passed, use it; else create deterministic fallback
  let baseAngle = opts?.inheritedArc?.angle ?? 0;
  let span = opts?.inheritedArc?.span ?? Math.PI / 3;
  const radius = opts?.inheritedArc?.radius ?? 260;
  const TELEGRAPH = Math.round(45 * Math.min(1.5, adj));
  const FIRE = 120; // fire duration
  let damageTick = 0;
  return {
    id: 'laser-arc-sweep',
    version: 1,
    start(ctx: OrchestratorContext) {
      if (opts?.inheritedArc == null) {
        baseAngle = ctx.rng.next() * Math.PI * 2; // deterministic fallback
        span = span * (1 + Math.min(0.4, (adj - 1) * 0.5));
      }
    },
    update(dt: number, ctx: OrchestratorContext) {
      frame++;
      if (frame <= TELEGRAPH) {
        // Pre-fire slow wobble
        baseAngle += 0.005;
      } else {
        // Firing: sweep slowly
        baseAngle += 0.01 * (1 / Math.min(1.4, 1 + (adj - 1) * 0.4));
        damageTick += dt;
        if (damageTick >= 0.2) { // apply damage every 0.2s
          damageTick = 0;
          // Determine player position relative to safe arc; placeholder player at (0,0) currently
          const px = 0, py = 0; // TODO: integrate real player position when available in state
          const ang = Math.atan2(py, px); // angle from origin
          let diff = Math.abs(((ang - baseAngle + Math.PI*3) % (Math.PI*2)) - Math.PI);
          const halfSpan = span/2;
          const inside = diff <= halfSpan;
          if (!inside && !state.playerDead) {
            // Simple damage application (favor armor first like survivability system logic)
            const dmg = 8;
            if ((state.playerArmor ?? 0) > 0) {
              state.playerArmor = Math.max(0, (state.playerArmor||0) - dmg);
            } else {
              state.playerHealth = Math.max(0, (state.playerHealth||0) - dmg);
              if ((state.playerHealth||0) <= 0) state.playerDead = true;
            }
          }
        }
      }
      if (frame >= TELEGRAPH + FIRE) return true;
      return false;
    },
    serializeState() {
      return {
        id: 'laser-arc-sweep',
        frame,
        telegraph: frame <= TELEGRAPH,
        firing: frame > TELEGRAPH,
        arc: { angle: baseAngle, span, radius },
        fairnessAdj: adj,
        telegraphFrames: TELEGRAPH,
        fireFrames: FIRE,
        totalFrames: TELEGRAPH + FIRE
      };
    },
    end() { /* no-op */ }
  };
}
