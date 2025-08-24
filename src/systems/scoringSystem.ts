import { System, OrchestratorContext, eventBus } from '../engine';
import { GameState } from '../state/gameState';

/**
 * Scoring & Wave Pressure System (experimental, non-golden)
 * - Tracks cumulative score based on kills, grazes, overdrive usage, boss damage efficiency.
 * - Maintains a wavePressure metric (0..1) derived from (waveKills / waveTarget) with decay to smooth spikes.
 * - Emits 'scoreUpdate' events when score changes significantly.
 * NOTES: Not currently persisted in snapshots; excluded from golden invariants intentionally.
 */
export interface ScoreSummary { score: number; wavePressure: number; lastEmitScore: number; }

export function createScoringSystem(state: GameState, summary: ScoreSummary): System {
  // Tunable coefficients (protected by GOLDEN_MODE separation if later baked)
  const GOLDEN_MODE = !!process.env.GOLDEN_MODE; // only used to freeze future adjustments if promoted
  const killScore = GOLDEN_MODE ? 100 : 100;
  const grazeScore = GOLDEN_MODE ? 5 : 7; // allow iteration outside golden
  const overdriveBonus = GOLDEN_MODE ? 250 : 300;
  const bossDamageFactor = GOLDEN_MODE ? 0.1 : 0.12; // points per HP damaged
  const pressureDecay = 0.95; // per-frame exponential decay for smoothing
  const emitThreshold = 500; // emit event when delta since last emit >= threshold
  return {
    id: 'scoring', order: 90, // after combat resolution but before boss maybe ends (boss order=70 so this runs after) adjust if necessary
    update(dt: number, ctx: OrchestratorContext) {
      // Wave pressure smoothing: approach instantaneous ratio but decay downward when stagnating
      const instantaneous = state.waveTarget > 0 ? state.waveKills / state.waveTarget : 0;
      if (instantaneous > summary.wavePressure) summary.wavePressure = instantaneous; else summary.wavePressure *= pressureDecay;
      if (summary.wavePressure < 0) summary.wavePressure = 0; if (summary.wavePressure > 1) summary.wavePressure = 1;

      // Score accumulation proxies (read-only side-effects of other systems)
      // Kills: approximate new kills via total kills delta (won't double count)
      if (!('_lastKills' in (summary as any))) (summary as any)._lastKills = state.kills;
      const lk = (summary as any)._lastKills;
      if (state.kills > lk) {
        const delta = state.kills - lk;
        summary.score += delta * killScore;
        (summary as any)._lastKills = state.kills;
      }
      // Graze: similar approach
      if (!('_lastGraze' in (summary as any))) (summary as any)._lastGraze = state.grazeCount;
      const lg = (summary as any)._lastGraze;
      if (state.grazeCount > lg) {
        const delta = state.grazeCount - lg;
        summary.score += delta * grazeScore;
        (summary as any)._lastGraze = state.grazeCount;
      }
      // Overdrive: award on activation
      if (!('_lastODActive' in (summary as any))) (summary as any)._lastODActive = state.overdriveActive;
      const lastOD = (summary as any)._lastODActive;
      if (!lastOD && state.overdriveActive) {
        summary.score += overdriveBonus;
      }
      (summary as any)._lastODActive = state.overdriveActive;
      // Boss damage: integrate log events since last frame
      if (!('_lastBossLogIndex' in (summary as any))) (summary as any)._lastBossLogIndex = 0;
      const idx = (summary as any)._lastBossLogIndex;
      const newEvents = state.bossDamageLog.slice(idx);
      let dmgTotal = 0;
      for (const e of newEvents) dmgTotal += e.amount;
      if (dmgTotal > 0) summary.score += dmgTotal * bossDamageFactor;
      (summary as any)._lastBossLogIndex = state.bossDamageLog.length;

      // Emit event if threshold reached
      if (summary.score - summary.lastEmitScore >= emitThreshold) {
        eventBus.emit('scoreUpdate', { score: summary.score, wavePressure: summary.wavePressure });
        summary.lastEmitScore = summary.score;
      }
    }
  };
}

export function createScoreSummary(): ScoreSummary { return { score: 0, wavePressure: 0, lastEmitScore: 0 }; }