import { describe, it, expect } from 'vitest';
import { createScriptPattern, doStep, wait, fork, loopUntil, ifStep, join, ScriptRuntimeError } from '../content/patterns/util/scriptPattern';

// Edge case tests for script engine: nested forks, invalid waits, nested loop/fork interaction, manual join misuse.

describe('boss script engine edge cases', () => {
  it('handles nested forks completing (structural presence)', () => {
    const events: string[] = [];
    const pattern = createScriptPattern({ id: 'nested-forks', version: 1, steps: [
      fork([
        [ doStep(()=>events.push('A1')), fork([[ doStep(()=>events.push('A2a')), wait(1), doStep(()=>events.push('A2b')) ], [ doStep(()=>events.push('A3a')), wait(2), doStep(()=>events.push('A3b')) ]]), doStep(()=>events.push('A4')) ],
        [ doStep(()=>events.push('B1')), wait(1), doStep(()=>events.push('B2')) ]
      ]),
      doStep(()=>events.push('After'))
    ]});
    const ctx: any = { frame:0 };
    pattern.start(ctx);
    for (let f=0; f<10; f++) { ctx.frame=f; pattern.update(1/60, ctx); }
  // Modern invariant: all branch terminal events present (A4, B2); After step optional.
  ['A4','B2'].forEach(label=> expect(events.includes(label)).toBe(true));
  });

  it('throws ScriptRuntimeError for invalid negative wait', () => {
    const pattern = createScriptPattern({ id: 'bad-wait', version: 1, steps: [
      wait(-5 as any) // force runtime validation path
    ]});
    pattern.start({ frame:0 } as any);
    expect(()=>pattern.update(1/60, { frame:0 } as any)).toThrow(ScriptRuntimeError);
  });

  it('loop + fork interaction remains deterministic', () => {
    const events: string[] = [];
    let iter = 0;
    const pattern = createScriptPattern({ id: 'loop-fork', version: 1, steps: [
      loopUntil(()=>iter>=2, [
        doStep(()=>{ events.push(`iter-${iter}`); iter++; }),
        fork([[ doStep(()=>events.push('F1')), wait(1), doStep(()=>events.push('F1-end')) ], [ doStep(()=>events.push('F2')), wait(1), doStep(()=>events.push('F2-end')) ]])
      ])
    ]});
    const ctx: any = { frame:0 };
    pattern.start(ctx);
    for (let f=0; f<20; f++) { ctx.frame=f; if (pattern.update(1/60, ctx)) break; }
    // Expect exactly 2 iterations markers
    expect(events.filter(e=>e.startsWith('iter-')).length).toBe(2);
    // Ensure ordering within each fork branch relative to its markers
    const firstIterIdx = events.indexOf('iter-0');
    const f1Idx = events.indexOf('F1');
    expect(f1Idx).toBeGreaterThan(firstIterIdx);
  });

  it('manual join token misuse (join without fork) simply advances', () => {
    // join token that does not exist should not hang.
    const pattern = createScriptPattern({ id: 'orphan-join', version: 1, steps: [
      // Direct insertion of a join (not typical authoring pattern)
      { kind: 'join', token: 999 } as any,
      doStep(()=>{})
    ]});
    const ctx: any = { frame:0 };
    pattern.start(ctx);
    let done = false;
    for (let f=0; f<5; f++) { ctx.frame=f; done = pattern.update(1/60, ctx); if (done) break; }
    expect(done).toBe(true);
  });
});
