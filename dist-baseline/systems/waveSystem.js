import { eventBus } from '../engine/index.js';
export function createWaveSystem(state) {
    return {
        id: 'wave', order: -90,
        update: (_dt, _ctx) => {
            if (state.waveKills >= state.waveTarget) {
                const prev = state.wave;
                state.wave += 1;
                state.waveKills = 0;
                state.waveTarget = Math.min(100, Math.ceil(state.waveTarget * 1.25));
                eventBus.emit('waveStart', { wave: state.wave, prevWave: prev, target: state.waveTarget });
            }
        }
    };
}
