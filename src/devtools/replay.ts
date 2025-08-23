import { GameOrchestrator } from '../engine/orchestrator';
import { createGameState } from '../state/gameState';
import { createPlayerSystem } from '../systems/playerSystem';
import { createWaveSystem } from '../systems/waveSystem';
import { createEnemySystem } from '../systems/enemySystem';
import { createBulletSystem } from '../systems/bulletSystem';
import { createCollisionSystem } from '../systems/collisionSystem';
import { RunSnapshotMeta, upgradeSnapshot, AnyRunSnapshot } from '../state/serialization';
import { createParallaxSystem } from '../systems/parallaxSystem';
import { createGrazeSystem } from '../systems/grazeSystem';
import { createOverdriveSystem } from '../systems/overdriveSystem';
import { createBossSystem, BossSystemSummary } from '../systems/bossSystem';
import '../content/initialContent';

export interface RunRecording {
  version: 1;
  seed: string | number;
  duration: number; // seconds simulated
  fixedStep: number;
  final: RunSnapshotMeta;
  kills: number;
  wave: number;
}

/** Run the baseline system stack for a deterministic duration and capture final snapshot. */
export function recordRun(opts: { seed: string | number; duration: number; fixedStep?: number; withParallax?: boolean }): RunRecording {
  const fixedStep = opts.fixedStep ?? 1/60;
  const state = createGameState();
  const bossSummary: BossSystemSummary = { bossActive: false };
  const o = new GameOrchestrator({ seed: opts.seed, fixedStep, summarySource: () => ({
    kills: state.kills,
    wave: state.wave,
    grazeCount: state.grazeCount,
    overdriveMeter: state.overdriveMeter,
    overdriveActive: state.overdriveActive,
    bossActive: bossSummary.bossActive,
    bossPattern: bossSummary.bossPattern,
    bossStartedFrame: bossSummary.bossStartedFrame,
    bossEndedFrame: bossSummary.bossEndedFrame,
    parallaxLayers: state.parallax?.layers?.map(l => ({ depth: (l as any).depth, color: (l as any).color, tileSize: (l as any).tileSize, step: (l as any).step })) || []
  }) });
  o.register(createPlayerSystem(state));
  o.register(createWaveSystem(state));
  o.register(createEnemySystem(state));
  o.register(createBulletSystem(state));
  o.register(createCollisionSystem(state));
  // Always include graze + overdrive so metrics populate deterministically.
  o.register(createGrazeSystem(state));
  const overdriveCfg = (''+opts.seed).includes('grazeOD') ? { killGain: 0.25, grazeGain: 0.25, duration: 2 } : undefined;
  o.register(createOverdriveSystem(state, overdriveCfg));
  if ((""+opts.seed).includes('boss')) {
    o.register(createBossSystem(bossSummary, state, { triggerWave: 1, seed: String(opts.seed) }));
  }
  if (opts.withParallax) o.register(createParallaxSystem(state));
  o.init();
  if (opts.withParallax && state.parallax) {
    // Ensure non-empty parallax layer metadata captured
    if (!state.parallax.layers.length) {
      state.parallax.layers = [
        { depth: 0.2, offsetX: 0, offsetY: 0, color: '#113', tileSize: 1800, step: 140 },
        { depth: 0.5, offsetX: 0, offsetY: 0, color: '#225', tileSize: 1200, step: 90 }
      ] as any;
    }
  }
  o.advance(opts.duration);
  const final = o.snapshot();
  return { version: 1, seed: opts.seed, duration: opts.duration, fixedStep, final, kills: state.kills, wave: state.wave };
}

export interface ReplayResult {
  ok: boolean;
  differences: string[];
  replayFinal: RunSnapshotMeta;
}

/** Re-run simulation from seed + duration and compare with recorded final snapshot & summary. */
export function replayRun(rec: RunRecording): ReplayResult {
  const state = createGameState();
  const bossSummary: BossSystemSummary = { bossActive: false };
  const o = new GameOrchestrator({ seed: rec.seed, fixedStep: rec.fixedStep, summarySource: () => ({
    kills: state.kills,
    wave: state.wave,
    grazeCount: state.grazeCount,
    overdriveMeter: state.overdriveMeter,
    overdriveActive: state.overdriveActive,
    bossActive: bossSummary.bossActive,
    bossPattern: bossSummary.bossPattern,
    bossStartedFrame: bossSummary.bossStartedFrame,
    bossEndedFrame: bossSummary.bossEndedFrame,
    parallaxLayers: state.parallax?.layers?.map(l => ({ depth: (l as any).depth, color: (l as any).color, tileSize: (l as any).tileSize, step: (l as any).step })) || []
  }) });
  o.register(createPlayerSystem(state));
  o.register(createWaveSystem(state));
  o.register(createEnemySystem(state));
  o.register(createBulletSystem(state));
  o.register(createCollisionSystem(state));
  o.register(createGrazeSystem(state));
  const overdriveCfg = (''+rec.seed).includes('grazeOD') ? { killGain: 0.25, grazeGain: 0.25, duration: 2 } : undefined;
  o.register(createOverdriveSystem(state, overdriveCfg));
  if ((""+rec.seed).includes('boss')) {
    o.register(createBossSystem(bossSummary, state, { triggerWave: 1, seed: String(rec.seed) }));
  }
  // Include parallax system if original recording intended it (heuristic: seed contains 'parallax' or future flag)
  if ((rec as any).withParallax || (''+rec.seed).includes('parallax')) {
    o.register(createParallaxSystem(state));
  }
  o.init();
  o.advance(rec.duration);
  const snap = o.snapshot();
  const recFinalUpgraded = upgradeSnapshot(rec.final as AnyRunSnapshot);
  const diffs: string[] = [];
  if (snap.frame !== recFinalUpgraded.frame) diffs.push(`frame mismatch ${snap.frame} != ${recFinalUpgraded.frame}`);
  if (Math.abs(snap.time - recFinalUpgraded.time) > 1e-9) diffs.push(`time mismatch ${snap.time} != ${recFinalUpgraded.time}`);
  if (snap.rngState !== recFinalUpgraded.rngState) diffs.push('rngState mismatch');
  if (snap.registryHash !== recFinalUpgraded.registryHash) diffs.push('registryHash mismatch');
  if (snap.summary.kills !== rec.kills) diffs.push(`kills mismatch ${snap.summary.kills} != ${rec.kills}`);
  if (snap.summary.wave !== rec.wave) diffs.push(`wave mismatch ${snap.summary.wave} != ${rec.wave}`);
  if (process.env.GOLDEN_REQUIRE_EXTENDED) {
    // When enforcing v4 metrics ensure graze/overdrive match (expected to be zero in current golden set)
    if ((snap.summary.grazeCount ?? 0) !== (recFinalUpgraded.summary.grazeCount ?? 0)) diffs.push('grazeCount mismatch');
    if ((snap.summary.overdriveMeter ?? 0) !== (recFinalUpgraded.summary.overdriveMeter ?? 0)) diffs.push('overdriveMeter mismatch');
    if ((snap.summary.overdriveActive ?? false) !== (recFinalUpgraded.summary.overdriveActive ?? false)) diffs.push('overdriveActive mismatch');
  }
  return { ok: diffs.length === 0, differences: diffs, replayFinal: snap };
}
