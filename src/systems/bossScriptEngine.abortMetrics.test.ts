import { describe, it, expect } from 'vitest';
import { createScriptPattern, doStep, wait, loopUntil } from '../content/patterns/util/scriptPattern';

describe('boss script engine abort & metrics', () => {
  it('aborts early and reports metrics', () => {
    const events: string[] = [];
    let frame = 0; const ctx: any = { frame };
    const pattern: any = createScriptPattern({ id: 'abort-demo', version: 1, steps: [
      doStep(()=>events.push('start')),
      loopUntil(()=>ctx.frame>=5, [ doStep(()=>events.push('loop')), wait(1) ]),
      doStep(()=>events.push('after'))
    ]});
    pattern.start(ctx);
    for (frame=0; frame<10; frame++) {
      ctx.frame = frame;
      if (frame === 3) pattern.__scriptAbort();
      const done = pattern.update(1/60, ctx);
      if (done) break;
    }
    expect(events).toContain('start');
    // Should not have executed 'after' because aborted before loop completion
    expect(events).not.toContain('after');
    const m = pattern.__scriptMetrics();
    expect(m.aborted).toBe(true);
    expect(m.done).toBe(true);
    expect(m.loopIterations).toBeGreaterThan(0);
  });
});
