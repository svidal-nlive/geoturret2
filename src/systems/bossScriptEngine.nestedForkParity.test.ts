import { describe, it, expect } from 'vitest';
import { createScriptPattern, doStep, wait, fork, ifStep } from '../content/patterns/util/scriptPattern';

// Deep nested fork/join parity & aggregation stress test.
// Goal: ensure complex multi-level forks aggregate executedLabelCounts & rngDraws identically
// for a continuous run vs a resume mid-tree.

describe('boss script engine nested fork aggregation parity', () => {
  function mkPattern() {
    // Helper producing a labeled RNG draw side-effect.
    const draw = (label: string) => doStep((ctx: any)=>{ ctx.rng.draws++; }, label);
    return createScriptPattern({ id: 'nested-fork', version: 1, steps: [
      doStep(()=>{}, 'root-start'),
      fork([
        [ // Branch 1
          draw('B1-A1'),
          fork([
            [ draw('B1-A2a'), wait(1,'w1'), draw('B1-A2b') ],
            [ draw('B1-A3a'), fork([[ draw('B1-A3b1'), wait(1,'w2'), draw('B1-A3b2') ], [ draw('B1-A3c1'), wait(2,'w3'), draw('B1-A3c2') ]]), draw('B1-A3z') ]
          ], 'nested-1'),
          ifStep((ctx:any)=>{ ctx.rng.draws++; return true; }, [ draw('B1-ifT') ], [ draw('B1-ifF') ], 'if-branch'),
          draw('B1-end')
        ],
        [ // Branch 2
          draw('B2-A1'), wait(2,'w4'), fork([
            [ draw('B2-A2a'), wait(1,'w5'), draw('B2-A2b') ],
            [ draw('B2-A3a'), wait(1,'w6'), draw('B2-A3b') ]
          ], 'nested-2'), draw('B2-end')
        ]
      ], 'root-fork'),
      doStep(()=>{}, 'after-root')
    ]});
  }

  function aggregate(state: any) {
    const out: Record<string, number> = { ...(state.executedLabelCounts||{}) };
    let rng = state.rngDraws || 0;
    for (const f of state.forks || []) {
      for (const r of f.runners) {
        const child = aggregate(r);
        for (const [k,v] of Object.entries(child.counts)) out[k] = (out[k]||0)+(v as number);
        rng += child.rng;
      }
    }
    return { counts: out, rng };
  }

  it('continuous vs resume parity for deep nested forks', () => {
    const mkCtx = () => ({ frame:0, rng:{ draws:0 } });
    const ctxA: any = mkCtx();
    const patternA: any = mkPattern(); patternA.start(ctxA);
    // Run a couple frames then snapshot mid-fork activity
    for (let f=0; f<3; f++) { ctxA.frame=f; patternA.update(1/60, ctxA); }
    const snap = patternA.serializeState();

    const ctxB: any = { frame: ctxA.frame, rng:{ draws: ctxA.rng.draws } };
    const patternB: any = mkPattern(); patternB.start(ctxB); patternB.restoreState(snap);

    // Advance both to completion
    for (let f=0; f<400; f++) {
      ctxA.frame++; ctxB.frame = ctxA.frame;
      const dA = patternA.update(1/60, ctxA);
      const dB = patternB.update(1/60, ctxB);
      if (dA || dB) break;
    }
    const finalA = patternA.serializeState();
    const finalB = patternB.serializeState();
    expect(finalA.done).toBe(true); expect(finalB.done).toBe(true);
    // Ensure forks fully collapsed (aggregation occurred)
    expect((finalA.forks||[]).length).toBe(0);
    expect((finalB.forks||[]).length).toBe(0);

    const aggA = aggregate(finalA); const aggB = aggregate(finalB);
    expect(aggA.counts).toEqual(aggB.counts);
    expect(aggA.rng).toBe(aggB.rng);

    // Every labeled RNG draw step should run exactly once.
    Object.entries(aggA.counts).forEach(([label, count]) => {
      if (label.startsWith('B')) expect(count).toBe(1);
    });
  });
});
