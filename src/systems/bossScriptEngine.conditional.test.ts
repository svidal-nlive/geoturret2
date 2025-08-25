import { describe, it, expect } from 'vitest';
import { createScriptPattern, doStep, wait, ifStep, loopUntil } from '../content/patterns/util/scriptPattern';

describe('boss script engine conditionals & loops', () => {
  it('executes ifStep selecting correct branch then continues', () => {
    const events: string[] = [];
    const pattern = createScriptPattern({ id: 'cond', version: 1, steps: [
      ifStep(() => true, [doStep(()=>events.push('T'))], [doStep(()=>events.push('F'))]),
      doStep(()=>events.push('after'))
    ]});
    const ctx: any = { frame:0 };
    pattern.start(ctx);
    for (let f=0; f<10; f++) {
      ctx.frame = f;
      const done = pattern.update(1/60, ctx);
      if (done) break;
    }
    expect(events[0]).toBe('T');
    expect(events).toContain('after');
  });

  it('loopUntil terminates when predicate true and records sequential body iterations', () => {
    let frame = 0; const ctx: any = { frame };
    const events: number[] = [];
    const pattern = createScriptPattern({ id: 'loop', version: 1, steps: [
      loopUntil(c=>c.frame>=3, [doStep(c=>events.push(c.frame)), wait(1)])
    ]});
    pattern.start(ctx);
    for (frame=0; frame<30; frame++) {
      ctx.frame = frame;
      const done = pattern.update(1/60, ctx);
      if (done) break;
    }
    // Should have captured monotonically increasing frames less than 3
    expect(events.length).toBeGreaterThan(0);
    expect(events.every(v=>v<3)).toBe(true);
    for (let i=1;i<events.length;i++) expect(events[i]).toBeGreaterThanOrEqual(events[i-1]);
  });
});
