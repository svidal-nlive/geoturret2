/**
 * Boss pattern: pre-laser-arc-preview
 * Purpose: Telegraph an impending sweeping laser by showing an arc safe lane preview.
 * Duration: Telegraph phase then completes (placeholder – no actual laser yet).
 * Fairness: adjustmentFactor widens arc and extends telegraph.
 */
import { BossPattern } from '../bossPattern';
import { OrchestratorContext } from '../../engine';
import { GameState } from '../../state/gameState';

export function createPreLaserArcPreviewPattern(state: GameState): BossPattern {
  let frame = 0;
  const adj = state.fairness.adjustmentFactor || 1;
  const TELEGRAPH_FRAMES = Math.round(120 * Math.min(1.8, adj)); // up to +80% longer when struggling
  const BASE_RADIUS = 260;
  let angle = 0; // center angle (radians)
  let span = Math.PI / 3; // 60 deg baseline safe span
  return {
    id: 'pre-laser-arc-preview',
    version: 1,
    start(ctx: OrchestratorContext) {
      angle = ctx.rng.next() * Math.PI * 2; // deterministic
      // widen safe arc modestly with adj (up to +50%)
      span = span * (1 + Math.min(0.5, (adj - 1) * 0.5));
    },
    update(_dt, ctx: OrchestratorContext) {
      frame++;
      // subtle rotation for visual interest (slower if struggling to reduce motion load)
      const rotSpeed = 0.01 * (1 / Math.min(1.5, 1 + (adj - 1) * 0.5));
      angle += rotSpeed;
      if (frame >= TELEGRAPH_FRAMES) return true; // complete; later replaced by actual laser pattern
      return false;
    },
    serializeState() {
      const telegraphing = frame < TELEGRAPH_FRAMES;
      return {
        id: 'pre-laser-arc-preview',
        frame,
        telegraph: telegraphing,
        arc: { angle, span, radius: BASE_RADIUS },
        fairnessAdj: adj,
        done: !telegraphing,
        telegraphFrames: TELEGRAPH_FRAMES,
        totalFrames: TELEGRAPH_FRAMES,
        chainNext: telegraphing ? undefined : 'laser-arc-sweep',
        chainArc: telegraphing ? undefined : { angle, span, radius: BASE_RADIUS }
      };
    },
    end() { /* no-op */ }
  };
}
