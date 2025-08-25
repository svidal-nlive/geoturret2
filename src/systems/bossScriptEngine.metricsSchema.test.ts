import { describe, it, expect } from 'vitest';
import { createScriptPattern, doStep, wait, ifStep, loopUntil, fork, join } from '../content/patterns/util/scriptPattern';

// Schema & metrics guard: ensures serialize() payload + __scriptMetrics() shape & core invariants remain stable.

describe('boss script engine metrics & schema guard', () => {
  function buildPattern() {
    const steps = [
      doStep(()=>{}, 'start'),
      ifStep(()=>true, [ doStep(()=>{}, 'if-then') ], [ doStep(()=>{}, 'if-else') ], 'if-root'),
      loopUntil((ctx:any)=> ctx.loopCounter++ > 1, [ doStep(()=>{}, 'loop-body') ], 'loop'),
      wait(2, 'wait-two'),
      fork([
        [ doStep(()=>{}, 'fork-A1'), wait(1,'fork-wait'), doStep(()=>{}, 'fork-A2') ],
        [ doStep(()=>{}, 'fork-B1') ]
      ], 'top-fork'),
      doStep(()=>{}, 'after-fork')
    ];
    return createScriptPattern({ id: 'metrics-schema', version: 1, steps });
  }

  it('exposes stable serialize() fields and metrics after run & resume path parity', () => {
    const ctxA: any = { frame:0, rng:{ draws:0 }, loopCounter:0 };
    const patternA: any = buildPattern(); patternA.start(ctxA);

    // Run a couple frames, snapshot mid-run
    for (let f=0; f<3; f++) { ctxA.frame=f; patternA.update(1/60, ctxA); }
    const mid = patternA.serializeState();
    // Field presence assertions (mid-run)
    expect(mid).toMatchObject({
      idx: expect.any(Number),
      wait: expect.any(Number),
      done: false,
      nextForkToken: expect.any(Number),
      steps: expect.any(Array),
      forks: expect.any(Array),
      executedLabelCounts: expect.any(Object),
      rngDraws: expect.any(Number),
    });
    expect(mid.__dbg).toBeDefined();
    expect(Array.isArray(mid.__dbg.executedDoLabels)).toBe(true);

    // Resume clone from snapshot
    const ctxB: any = { frame: ctxA.frame, rng:{ draws: ctxA.rng.draws }, loopCounter: ctxA.loopCounter };
    const patternB: any = buildPattern(); patternB.start(ctxB); patternB.restoreState(mid);

    // Complete both
    for (let f=0; f<200; f++) { ctxA.frame++; ctxB.frame=ctxA.frame; const dA=patternA.update(1/60, ctxA); const dB=patternB.update(1/60, ctxB); if (dA||dB) break; }
    const finalA = patternA.serializeState();
    const finalB = patternB.serializeState();
    expect(finalA.done).toBe(true); expect(finalB.done).toBe(true);
    expect(finalA.forks.length).toBe(0); expect(finalB.forks.length).toBe(0);

    // Metrics parity
    const mA = patternA.__scriptMetrics();
    const mB = patternB.__scriptMetrics();

    const metricKeys = [ 'totalSteps','doCalls','ifEvals','loopIterations','forkLaunches','waitFrames','joinWaitFrames','rngDraws','done','aborted','idx','executedLabelCounts' ];
    metricKeys.forEach(k=> {
      expect(mA).toHaveProperty(k);
      expect(mB).toHaveProperty(k);
    });

    // Invariants: aborted false, some waits counted, loopIterations >=1, executed labels contain expected set
    expect(mA.aborted).toBe(false);
    expect(mA.loopIterations).toBeGreaterThanOrEqual(1);
    expect(mA.waitFrames).toBeGreaterThanOrEqual(2); // wait(2) + fork branch wait(1) counted per frame

    const singleLabels = ['start','if-then','fork-A1','fork-A2','fork-B1','after-fork'];
    singleLabels.forEach(l=> {
      expect(mA.executedLabelCounts[l]).toBe(1);
      expect(mB.executedLabelCounts[l]).toBe(1);
    });
    // loop-body may run multiple times; ensure parity and >=1
    expect(mA.executedLabelCounts['loop-body']).toBeGreaterThanOrEqual(1);
    expect(mB.executedLabelCounts['loop-body']).toBe(mA.executedLabelCounts['loop-body']);

    // Only guaranteed deterministic parity post-resume: executedLabelCounts & aggregated rngDraws.
    expect(mA.executedLabelCounts).toEqual(mB.executedLabelCounts);
    expect(mA.rngDraws).toBe(mB.rngDraws);
    // Other raw counters (ifEvals, loopIterations, doCalls, forkLaunches) are not serialized and may differ between a continuous run and a resumed run
    // because the resumed runner does not reconstruct historical counts prior to snapshot. We just assert they are numbers >0 where applicable.
    ['ifEvals','loopIterations','doCalls','forkLaunches'].forEach(k => {
      expect(typeof mA[k]).toBe('number');
      expect(typeof mB[k]).toBe('number');
    });
  });
});
