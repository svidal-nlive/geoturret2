import { System, OrchestratorContext, eventBus } from '../engine';
import { GameState } from '../state/gameState';

export interface OverdriveConfig {
  killGain?: number; // meter per kill
  grazeGain?: number; // meter per graze
  duration?: number; // seconds active
  fireRateMultiplier?: number; // applied to bullet interval (1 / multiplier faster)
}

export function createOverdriveSystem(state: GameState, cfg?: OverdriveConfig): System {
  const killGain = cfg?.killGain ?? 0.05;
  const grazeGain = cfg?.grazeGain ?? 0.02;
  const duration = cfg?.duration ?? 5;
  return {
    id: 'overdrive', order: 50,
    init: () => {
      eventBus.on('kill', () => { add(killGain); });
      eventBus.on('graze', () => { add(grazeGain); });
    },
    update: (dt: number, _ctx: OrchestratorContext) => {
      if (state.overdriveActive) {
        state.overdriveTimeRemaining -= dt;
        if (state.overdriveTimeRemaining <= 0) {
          state.overdriveActive = false;
          state.overdriveTimeRemaining = 0;
          eventBus.emit('overdriveEnd', {});
        }
      } else if (state.overdriveMeter >= 1) {
        state.overdriveMeter = 0;
        state.overdriveActive = true;
        state.overdriveTimeRemaining = duration;
        eventBus.emit('overdriveStart', { duration });
      }
    }
  };

  function add(v: number) {
    if (state.overdriveActive) return; // no accumulation while active (simplify)
    state.overdriveMeter = Math.min(1, state.overdriveMeter + v);
  }
}
