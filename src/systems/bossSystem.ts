import { System, OrchestratorContext, eventBus } from '../engine';
import { GameState } from '../state/gameState';
import { BossPattern } from '../content/bossPattern';
import { createLaserCrossPattern } from '../content/patterns/laserCross';
import { createSafeLaneVolleyPattern } from '../content/patterns/safeLaneVolley';
import { createMultiBeamIntersectPattern } from '../content/patterns/multiBeamIntersect';
import { createFutureConvergePattern } from '../content/patterns/futureConverge';
import { createSpiralBarragePattern } from '../content/patterns/spiralBarrage';
import { createScriptedDemoPattern } from '../content/patterns/scriptedDemo';
import { createPhaseForkDemoPattern } from '../content/patterns/phaseForkDemo';

/** Registry of runtime boss pattern factories keyed by id. (Runtime layer separate from data registries). */
const patternFactories: Record<string, (state: GameState) => BossPattern> = {
  'laser-cross': (state) => createLaserCrossPattern(state),
  'safe-lane-volley': (state) => createSafeLaneVolleyPattern(state),
  'multi-beam-intersect': (state) => createMultiBeamIntersectPattern(state),
  'future-converge': (state) => createFutureConvergePattern(state),
  'spiral-barrage': (state) => createSpiralBarragePattern(state)
  , 'scripted-demo': (state) => createScriptedDemoPattern(state)
  , 'phase-fork-demo': (state) => createPhaseForkDemoPattern(state)
};

export interface BossSystemSummary {
  bossActive: boolean;
  bossPattern?: string;
  bossStartedFrame?: number;
  bossEndedFrame?: number;
  /** Serialized pattern execution state when active (for persistence). */
  bossPatternState?: any;
  /** Instrumentation: total RNG draws performed inside active pattern update (accumulated) */
  bossPatternRngDraws?: number;
}

function derivePatternId(explicit: string | undefined, seed: string | undefined): string {
  const GOLDEN_MODE = !!process.env.GOLDEN_MODE;
  if (explicit) return explicit;
  const s = seed || '';
  // Golden mode: pattern derivation frozen to existing mapping; additional future heuristics should live below in non-golden path
  if (GOLDEN_MODE) {
    if (s.includes('safe')) return 'safe-lane-volley';
    if (s.includes('multi')) return 'multi-beam-intersect';
    if (s.includes('future')) return 'future-converge';
    if (s.includes('spiral')) return 'spiral-barrage';
    if (s.includes('script')) return 'scripted-demo';
    if (s.includes('phase')) return 'phase-fork-demo';
    return 'laser-cross';
  }
  if (s.includes('safe')) return 'safe-lane-volley';
  if (s.includes('multi')) return 'multi-beam-intersect';
  if (s.includes('future')) return 'future-converge';
  if (s.includes('spiral')) return 'spiral-barrage';
  if (s.includes('script')) return 'scripted-demo';
  if (s.includes('phase')) return 'phase-fork-demo';
  return 'laser-cross';
}

export function createBossSystem(summary: BossSystemSummary, state: GameState, opts?: { triggerWave?: number; patternId?: string; seed?: string; initialPatternState?: any }): System {
  const triggerWave = opts?.triggerWave ?? 1; // start after first wave advance
  const resolvedPatternId = derivePatternId(opts?.patternId, opts?.seed);
  let active: BossPattern | undefined;
  let completed = false;
  let startedFrame = -1;
  let endedFrame = -1;

  function tryStart(ctx: OrchestratorContext, resume = false) {
    if (completed || active) return;
    const factory = patternFactories[resolvedPatternId];
    if (!factory) throw new Error(`Boss pattern factory missing for id ${resolvedPatternId}`);
    active = factory(state);
    active.start(ctx);
    if (resume && opts?.initialPatternState && active.restoreState) {
      try { active.restoreState(opts.initialPatternState); } catch (e) { /* swallow & restart fresh */ }
    }
  summary.bossActive = true;
    summary.bossPattern = active.id;
  if (summary.bossPatternRngDraws == null) summary.bossPatternRngDraws = 0;
    startedFrame = resume && typeof summary.bossStartedFrame === 'number' ? summary.bossStartedFrame : ctx.frame;
    summary.bossStartedFrame = startedFrame;
    if (!resume) eventBus.emit('bossStart', { id: active.id, frame: ctx.frame });
  }

  return {
    id: 'boss', order: 70, // after core combat systems
    init(ctx) {
      summary.bossActive = !!summary.bossActive;
      eventBus.on('waveStart', (e: any) => {
        if (e.wave >= triggerWave && !active && !completed) tryStart(ctx);
      });
      // Resume path: summary indicates active pattern with serialized state
      if (summary.bossActive && summary.bossPattern === resolvedPatternId && opts?.initialPatternState) {
        tryStart(ctx, true);
      } else if (!active && !completed && state.wave >= triggerWave) {
        tryStart(ctx);
      }
    },
    update(dt, ctx) {
      if (active) {
        const before = (ctx.rng as any).draws ?? 0;
        const done = active.update(dt, ctx);
        const after = (ctx.rng as any).draws ?? before;
        if (after > before) {
          if (summary.bossPatternRngDraws == null) summary.bossPatternRngDraws = 0;
          summary.bossPatternRngDraws += (after - before);
        }
        summary.bossPatternState = active.serializeState?.();
        if (done) {
          active.end?.(ctx);
          summary.bossActive = false;
          endedFrame = ctx.frame;
          summary.bossEndedFrame = endedFrame;
          summary.bossPatternState = undefined;
          eventBus.emit('bossEnd', { id: active.id, frame: ctx.frame, durationFrames: ctx.frame - startedFrame });
          active = undefined;
          completed = true;
        }
      }
    },
    teardown(_ctx) {
      // no-op
    }
  };
}
