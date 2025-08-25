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
import { createPreLaserArcPreviewPattern } from '../content/patterns/preLaserArcPreview';
import { createLaserArcSweepPattern } from '../content/patterns/laserArcSweep';

/** Registry of runtime boss pattern factories keyed by id. (Runtime layer separate from data registries). */
const patternFactories: Record<string, (state: GameState) => BossPattern> = {
  'laser-cross': (state) => createLaserCrossPattern(state),
  'safe-lane-volley': (state) => createSafeLaneVolleyPattern(state),
  'multi-beam-intersect': (state) => createMultiBeamIntersectPattern(state),
  'future-converge': (state) => createFutureConvergePattern(state),
  'spiral-barrage': (state) => createSpiralBarragePattern(state)
  , 'scripted-demo': (state) => createScriptedDemoPattern(state)
  , 'phase-fork-demo': (state) => createPhaseForkDemoPattern(state)
  , 'pre-laser-arc-preview': (state) => createPreLaserArcPreviewPattern(state)
  , 'laser-arc-sweep': (state) => {
    const arc = (state as any).__bossChainArc;
    const p = createLaserArcSweepPattern(state, arc ? { inheritedArc: arc } : undefined);
    // consume arc so it's not reused accidentally
    if (arc) delete (state as any).__bossChainArc;
    return p;
  }
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
  /** Instrumentation: cumulative ms spent inside pattern update (when PERF_BOSS_ATTRIB enabled) */
  bossPatternUpdateMs?: number;
  /** Instrumentation: cumulative ms spent serializing pattern state */
  bossPatternSerializeMs?: number;
  /** Instrumentation: frames pattern updated */
  bossPatternFrames?: number;
  /** Script engine metrics snapshot (if script-based pattern exposes them) */
  bossPatternScriptMetrics?: any;
  /** External abort requested */
  bossAbortRequested?: boolean;
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
    if (s.includes('laser') && (s.includes('sweep') || s.includes('arc'))) return 'laser-arc-sweep';
    return 'laser-cross';
  }
  if (s.includes('safe')) return 'safe-lane-volley';
  if (s.includes('laser') && s.includes('sweep')) return 'laser-arc-sweep';
  if (s.includes('preview') || s.includes('arc')) return 'pre-laser-arc-preview';
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
  state.currentBossPatternId = active.id;
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
        if (summary.bossAbortRequested && active) {
          active.end?.(ctx);
          summary.bossActive = false;
          endedFrame = ctx.frame;
          summary.bossEndedFrame = endedFrame;
          // Preserve last pattern state snapshot after abort for diagnostics/determinism tests.
          state.currentBossPatternId = null;
          state.safeLaneIndex = null;
          eventBus.emit('bossAbort', { id: active.id, frame: ctx.frame });
          active = undefined; completed = true; return;
        }
        const before = (ctx.rng as any).draws ?? 0;
        const PROFILE = !!process.env.PERF_BOSS_ATTRIB;
        let upStart = 0, upEnd = 0, serStart = 0, serEnd = 0;
        if (PROFILE) upStart = performance.now();
        const done = active.update(dt, ctx);
        // If pattern exposes safe lane via serializeState, capture it (convention: state.safeLane)
        try {
          const st = (active as any).serializeState?.();
          if (st && typeof st.safeLane === 'number') {
            state.safeLaneIndex = st.safeLane as 0 | 1;
          }
          // Stash serializeState snapshot for downstream systems (render / fairness geometry)
          if (st) (state as any).__bossPatternState = st;
        } catch { /* ignore */ }
        if (PROFILE) upEnd = performance.now();
        const after = (ctx.rng as any).draws ?? before;
        if (after > before) {
          if (summary.bossPatternRngDraws == null) summary.bossPatternRngDraws = 0;
          summary.bossPatternRngDraws += (after - before);
        }
        if (PROFILE) serStart = performance.now();
        summary.bossPatternState = active.serializeState?.();
        if (PROFILE) serEnd = performance.now();
        // Capture script metrics if helper present
        if ((active as any).__scriptMetrics) {
          try { summary.bossPatternScriptMetrics = (active as any).__scriptMetrics(); } catch { /* ignore */ }
        }
        if (PROFILE) {
          summary.bossPatternUpdateMs = (summary.bossPatternUpdateMs || 0) + (upEnd - upStart);
          summary.bossPatternSerializeMs = (summary.bossPatternSerializeMs || 0) + (serEnd - serStart);
          summary.bossPatternFrames = (summary.bossPatternFrames || 0) + 1;
        }
        if (done) {
          const patternState = summary.bossPatternState as any;
          const chainNext = patternState?.chainNext;
            const chainArc = patternState?.chainArc;
          const canChain = chainNext && chainNext !== active.id && patternFactories[chainNext];
          active.end?.(ctx);
          if (canChain) {
            // set chain payload for next pattern factory
            if (chainArc) (state as any).__bossChainArc = chainArc;
            // start next pattern immediately without ending boss session
            const nextFactory = patternFactories[chainNext];
            active = nextFactory(state);
            active.start(ctx);
            state.currentBossPatternId = active.id;
            summary.bossPattern = active.id;
            startedFrame = ctx.frame; // treat as fresh pattern window
            summary.bossStartedFrame = startedFrame;
            // bossActive remains true; do not emit bossEnd; emit transition event
            eventBus.emit('bossPatternChain', { from: patternState?.id || 'unknown', to: chainNext, frame: ctx.frame });
          } else {
            summary.bossActive = false;
            endedFrame = ctx.frame;
            summary.bossEndedFrame = endedFrame;
            state.currentBossPatternId = null;
            state.safeLaneIndex = null;
            eventBus.emit('bossEnd', { id: active.id, frame: ctx.frame, durationFrames: ctx.frame - startedFrame });
            active = undefined;
            completed = true;
          }
        }
      }
    },
    teardown(_ctx) {
      // no-op
    }
  };
}
