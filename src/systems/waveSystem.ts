import { System, OrchestratorContext, eventBus } from '../engine';
import { GameState } from '../state/gameState';

/**
 * Basic wave progression system.
 * Advances wave when state.waveKills >= state.waveTarget.
 * On advance: wave++, waveKills reset, waveTarget scales (ceil(target * 1.25)).
 * Emits 'waveStart' typed event.
 */
export function createWaveSystem(state: GameState): System {
  return {
    id: 'wave', order: -90, // after player, before spawners
    update: (_dt, _ctx: OrchestratorContext) => {
      if (state.waveKills >= state.waveTarget) {
        const prev = state.wave;
        state.wave += 1;
        state.waveKills = 0;
        // scale target modestly, cap for early phases
        state.waveTarget = Math.min(100, Math.ceil(state.waveTarget * 1.25));
        eventBus.emit('waveStart', { wave: state.wave, prevWave: prev, target: state.waveTarget });
      }
    }
  };
}
