import fs from 'node:fs';
import { GameOrchestrator } from '../src/engine/orchestrator';
import { createGameState } from '../src/state/gameState';
import { createWaveSystem } from '../src/systems/waveSystem';
import { createEnemySystem } from '../src/systems/enemySystem';
import { createBulletSystem } from '../src/systems/bulletSystem';
import { createCollisionSystem } from '../src/systems/collisionSystem';
import { createGrazeSystem } from '../src/systems/grazeSystem';
import { createOverdriveSystem } from '../src/systems/overdriveSystem';
import { createBossSystem } from '../src/systems/bossSystem';
import { RNG } from '../src/engine/rng';
import '../src/content/initialContent';

interface BossSimOptions { seed: string; maxSeconds: number; bossPattern?: string; triggerWave?: number }
interface BossSimResult { seed: string; bossPattern: string | undefined; started: boolean; ended: boolean; startedFrame: number | null; endedFrame: number | null; durationFrames: number | null; frame: number; time: number; rngState: number; kills: number; wave: number; hash: string; }

function runBossSim(opts: BossSimOptions): BossSimResult {
  const state = createGameState();
  const rng = new RNG(opts.seed);
  const bossSummary: any = {};
  const orchestrator = new GameOrchestrator({ seed: rng, fixedStep: 1/60, summarySource: () => ({
    kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive,
    bossActive: !!bossSummary.bossActive, bossPattern: bossSummary.bossPattern || null, bossStartedFrame: bossSummary.bossStartedFrame ?? null, bossEndedFrame: bossSummary.bossEndedFrame ?? null
  }) });
  orchestrator.register(createWaveSystem(state));
  orchestrator.register(createEnemySystem(state));
  orchestrator.register(createBulletSystem(state));
  orchestrator.register(createCollisionSystem(state));
  orchestrator.register(createGrazeSystem(state));
  orchestrator.register(createOverdriveSystem(state));
  orchestrator.register(createBossSystem(bossSummary, state, { triggerWave: opts.triggerWave ?? 0, patternId: opts.bossPattern, seed: opts.seed }));
  orchestrator.init();
  const step = orchestrator.getStep();
  let elapsed = 0;
  while (elapsed < opts.maxSeconds && (!bossSummary.bossEndedFrame)) {
    orchestrator.advance(step);
    elapsed += step;
  }
  const snap = orchestrator.snapshot();
  // Build hash including boss lifecycle frames
  let h = 2166136261 >>> 0; const mix = (n:number)=>{ h^=(n>>>0); h=Math.imul(h,16777619)>>>0; };
  mix(snap.rngState); mix(state.kills); mix(state.wave);
  mix(bossSummary.bossStartedFrame ?? 0); mix(bossSummary.bossEndedFrame ?? 0);
  const durationFrames = (typeof bossSummary.bossStartedFrame === 'number' && typeof bossSummary.bossEndedFrame === 'number')
    ? (bossSummary.bossEndedFrame - bossSummary.bossStartedFrame)
    : null;
  mix(durationFrames ?? 0);
  const hash = ('00000000'+h.toString(16)).slice(-8);
  const startedFrame = (typeof bossSummary.bossStartedFrame === 'number') ? bossSummary.bossStartedFrame : null;
  const endedFrame = (typeof bossSummary.bossEndedFrame === 'number') ? bossSummary.bossEndedFrame : null;
  // startedFrame can legitimately be 0; treat numeric presence as truthy rather than coercing with !! which would mark frame 0 as false
  const started = startedFrame !== null;
  const ended = endedFrame !== null;
  return { seed: opts.seed, bossPattern: bossSummary.bossPattern, started, ended, startedFrame, endedFrame, durationFrames, frame: snap.frame, time: snap.time, rngState: snap.rngState, kills: state.kills, wave: state.wave, hash };
}

// CLI usage
if (import.meta.url === (process.argv[1] && new URL('file://' + process.argv[1]).href)) {
  const seed = process.env.BOSS_SIM_SEED || 'boss-sim-seed';
  const pattern = process.env.BOSS_SIM_PATTERN || undefined;
  const maxSeconds = parseFloat(process.env.BOSS_SIM_SECONDS || '25');
  const triggerWave = parseInt(process.env.BOSS_SIM_TRIGGER_WAVE || '1', 10);
  const result = runBossSim({ seed, bossPattern: pattern, maxSeconds, triggerWave });
  const ok = result.started && result.ended; // ensure full lifecycle observed
  if (!ok) {
    fs.mkdirSync('artifacts', { recursive: true });
    const artifactPath = `artifacts/boss-sim-failure-${seed}.json`;
    fs.writeFileSync(artifactPath, JSON.stringify(result, null, 2));
    console.error(`[boss-sim] FAILURE seed=${seed} pattern=${pattern||'auto'} result stored at ${artifactPath}`);
    process.exit(1);
  }
  console.log(JSON.stringify(result, null, 2));
}

export { runBossSim };