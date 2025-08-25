import { describe, it, expect } from 'vitest';
import { createScriptPattern, doStep, wait, loopUntil, ScriptRuntimeError } from '../content/patterns/util/scriptPattern';

// Error & abort handling coverage for script engine core.

describe('boss script engine error & abort handling', () => {
  it('throws enriched error for negative wait frames', () => {
    const pattern: any = createScriptPattern({ id: 'err-neg-wait', version: 1, steps: [ wait(-1, 'bad-wait') ] });
    const ctx: any = { frame: 0 };
    pattern.start(ctx);
    expect(() => pattern.update(1/60, ctx)).toThrow(ScriptRuntimeError);
    try {
      pattern.update(1/60, ctx);
    } catch (e: any) {
      expect(e.name).toBe('ScriptRuntimeError');
      expect(e.message).toContain('wait step frames must be');
      expect(e.info.stepKind).toBe('wait');
      expect(typeof e.info.index).toBe('number');
    }
  });

  it('abort stops further execution and sets aborted flag', () => {
    let afterRan = false;
    const pattern: any = createScriptPattern({ id: 'abort-flow', version: 1, steps: [
      doStep(()=>{}, 'start'),
      wait(50, 'long-wait'),
      doStep(()=>{ afterRan = true; }, 'after')
    ]});
    const ctx: any = { frame: 0 };
    pattern.start(ctx);
    // First update runs start step and enters wait
    pattern.update(1/60, ctx);
    const metricsBefore = pattern.__scriptMetrics();
    expect(metricsBefore.aborted).toBeFalsy();
    expect(metricsBefore.executedLabelCounts.start).toBe(1);
    // Abort mid-wait
    pattern.__scriptAbort();
    ctx.frame++;
    const done = pattern.update(1/60, ctx);
    expect(done).toBe(true);
    const metricsAfter = pattern.__scriptMetrics();
    expect(metricsAfter.aborted).toBe(true);
    expect(metricsAfter.done).toBe(true);
    expect(afterRan).toBe(false);
    expect(metricsAfter.executedLabelCounts.after).toBeUndefined();
  });

  it('runaway expansion guard triggers ScriptRuntimeError with stepKind=limit', () => {
    // loopUntil predicate always false => infinite expansion until guard trips.
    const infiniteLoop = loopUntil(()=>false, [ /* empty body to maximize iterations */ ]);
    const pattern: any = createScriptPattern({ id: 'runaway', version: 1, steps: [ infiniteLoop ] });
    const ctx: any = { frame: 0 };
    pattern.start(ctx);
    let caught: any;
    try {
      pattern.update(1/60, ctx);
    } catch (e: any) { caught = e; }
    expect(caught).toBeInstanceOf(ScriptRuntimeError);
    expect(caught.info.stepKind).toBe('limit');
    expect(caught.message).toContain('exceeded max steps');
  });
});
