import { System, OrchestratorContext, eventBus } from '../engine';
import { GameState } from '../state/gameState';
import { BossPattern } from '../content/bossPattern';
import { createLaserCrossPattern } from '../content/patterns/laserCross';
import { createSafeLaneVolleyPattern } from '../content/patterns/safeLaneVolley';
import { createMultiBeamIntersectPattern } from '../content/patterns/multiBeamIntersect';

/** Registry of runtime boss pattern factories keyed by id. (Runtime layer separate from data registries). */
const patternFactories: Record<string, (state: GameState) => BossPattern> = {
  'laser-cross': (state) => createLaserCrossPattern(state),
  'safe-lane-volley': (state) => createSafeLaneVolleyPattern(state),
  'multi-beam-intersect': (state) => createMultiBeamIntersectPattern(state)
};

export interface BossSystemSummary {
  bossActive: boolean;
  bossPattern?: string;
  bossStartedFrame?: number;
  bossEndedFrame?: number;
}

function derivePatternId(explicit: string | undefined, seed: string | undefined): string {
  if (explicit) return explicit;
  const s = seed || '';
  if (s.includes('safe')) return 'safe-lane-volley';
  if (s.includes('multi')) return 'multi-beam-intersect';
  return 'laser-cross';
}

export function createBossSystem(summary: BossSystemSummary, state: GameState, opts?: { triggerWave?: number; patternId?: string; seed?: string }): System {
  const triggerWave = opts?.triggerWave ?? 1; // start after first wave advance
  const resolvedPatternId = derivePatternId(opts?.patternId, opts?.seed);
  let active: BossPattern | undefined;
  let completed = false;
  let startedFrame = -1;
  let endedFrame = -1;

  function tryStart(ctx: OrchestratorContext) {
    if (completed || active) return;
    if (ctx.frame >= 0 && summary && !active) {
  const factory = patternFactories[resolvedPatternId];
  if (!factory) throw new Error(`Boss pattern factory missing for id ${resolvedPatternId}`);
  active = factory(state);
      active.start(ctx);
      summary.bossActive = true;
      summary.bossPattern = active.id;
      startedFrame = ctx.frame;
      summary.bossStartedFrame = startedFrame;
      eventBus.emit('bossStart', { id: active.id, frame: ctx.frame });
    }
  }

  return {
    id: 'boss', order: 70, // after core combat systems
    init(ctx) {
      summary.bossActive = false;
      eventBus.on('waveStart', (e: any) => {
        if (e.wave >= triggerWave && !active && !completed) {
          tryStart(ctx);
        }
      });
    },
    update(dt, ctx) {
      if (active) {
        const done = active.update(dt, ctx);
        if (done) {
          active.end?.(ctx);
          summary.bossActive = false;
            endedFrame = ctx.frame;
            summary.bossEndedFrame = endedFrame;
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
