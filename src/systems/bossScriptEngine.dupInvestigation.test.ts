import { describe, it, expect } from 'vitest';
import { createScriptPattern, doStep, wait, fork } from '../content/patterns/util/scriptPattern';

// Investigation test: captures serialization state mid-run and compares executed do labels pre/post resume.

describe('script engine duplication investigation', () => {
  it('captures executed labels pre and post resume', () => {
    const labels: string[] = [];
    const make = () => createScriptPattern({ id: 'dup-investigate', version: 1, steps: [
      doStep(()=>labels.push('root-start'),'root-start'),
      fork([
        [ doStep(()=>labels.push('A1'),'A1'), fork([[ doStep(()=>labels.push('A2a'),'A2a'), wait(1), doStep(()=>labels.push('A2b'),'A2b') ], [ doStep(()=>labels.push('A3a'),'A3a'), wait(2), doStep(()=>labels.push('A3b'),'A3b') ]]), doStep(()=>labels.push('A4'),'A4') ],
        [ doStep(()=>labels.push('B1'),'B1'), wait(1), doStep(()=>labels.push('B2'),'B2') ]
      ]),
      doStep(()=>labels.push('after'),'after')
    ]});
    const ctxA: any = { frame:0, rng: { draws:0 } }; const pA: any = make(); pA.start(ctxA);
    for (let f=0; f<2; f++) { ctxA.frame=f; pA.update(1/60, ctxA); }
    const snap = pA.serializeState();
    const executedPre = snap.__dbg.executedDoLabels.slice();
    const countsPre = { ...snap.executedLabelCounts };

    const ctxB: any = { frame: ctxA.frame, rng: { draws: ctxA.rng.draws } }; const pB: any = make(); pB.start(ctxB); pB.restoreState(snap);
    for (let i=0;i<200;i++){ ctxA.frame++; ctxB.frame=ctxA.frame; const dA=pA.update(1/60, ctxA); const dB=pB.update(1/60, ctxB); if (dA||dB) break; }
    const finalA = pA.serializeState(); const finalB = pB.serializeState();
    expect(finalA.done).toBe(true); expect(finalB.done).toBe(true);
    // Parity checks
    expect(finalA.executedLabelCounts).toEqual(finalB.executedLabelCounts);
    expect(finalA.rngDraws).toBe(finalB.rngDraws);
    // 'after' should have executed exactly once in each run
    expect(finalA.executedLabelCounts.after).toBe(1);
    expect(finalB.executedLabelCounts.after).toBe(1);
    // Snapshot prefix should be subset of final counts
    Object.keys(countsPre).forEach(k=> expect(finalA.executedLabelCounts[k]).toBeGreaterThanOrEqual(countsPre[k]));
  });
});