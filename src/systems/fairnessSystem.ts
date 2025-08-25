import { System, OrchestratorContext, eventBus } from '../engine';
import { GameState } from '../state/gameState';

/**
 * Fairness system:
 * - Tracks safe lane exposure windows and computes metrics for later enforcement.
 * - Boss patterns can set state.safeLaneIndex (0|1) each frame or null if no lane safe.
 * - Future: auto-adjust pattern parameters when metrics fall below thresholds.
 */
export function createFairnessSystem(state: GameState): System {
  let lastSafe: 0|1|null = null;
  let unsafeAccum = 0;
  const RECENT_HIT_WINDOW = 4; // seconds
  const HIT_DECAY_RATE = 1 / RECENT_HIT_WINDOW; // proportion per second
  let lastFactor = 1;
  return {
    id: 'fairness', order: 75, // run after boss (70) so it observes final safeLaneIndex for the frame
    init() {},
    update(dt: number, ctx: OrchestratorContext) {
      const current = state.safeLaneIndex;
      if (current != null) {
        if (lastSafe == null) {
          // New exposure window
          state.fairness.exposures += 1;
        }
        // If boss pattern provided lane geometry snapshot, use it.
        const patternState: any = (state as any).__bossPatternState;
        let computedWidth = 0.5; // fallback default
        if (patternState && typeof patternState.laneNormalizedWidth === 'number') {
          computedWidth = patternState.laneNormalizedWidth;
        }
        if (computedWidth < state.fairness.minSafeWidth) state.fairness.minSafeWidth = computedWidth;
      } else {
        unsafeAccum += dt;
        state.fairness.cumulativeUnsafeTime = unsafeAccum;
      }
      lastSafe = current;
      // Passive decay of recentHits (treat as bucket)
      if (state.fairness.recentHits > 0) {
        state.fairness._recentHitDecay = (state.fairness._recentHitDecay || 0) + dt;
        const decaySteps = Math.floor((state.fairness._recentHitDecay) * HIT_DECAY_RATE);
        if (decaySteps > 0) {
          state.fairness.recentHits = Math.max(0, state.fairness.recentHits - decaySteps);
          state.fairness._recentHitDecay = 0; // reset after applying discrete decay
        }
      }
      // Compute adjustment factor: widen lane if many recent hits or extended unsafe time
      const hits = state.fairness.recentHits;
      const unsafe = state.fairness.cumulativeUnsafeTime;
      // Simple heuristic: start scaling after 2 hits in window or >3s unsafe total
      let factor = 1;
      if (hits >= 2) factor = Math.min(1.6, 1 + 0.2 * (hits - 1));
      if (unsafe > 3) factor = Math.max(factor, Math.min(1.5, 1 + (unsafe - 3) * 0.1));
      if (factor !== lastFactor) {
        state.fairness.adjustmentFactor = factor;
        lastFactor = factor;
        eventBus.emit('fairnessAdjust', { factor });
      }
      // Placeholder: compute min safe width once patterns expose lane geometry (future)
      // state.fairness.minSafeWidth = Math.min(state.fairness.minSafeWidth, computedWidth)
    },
    teardown() {}
  };
}
