import { describe, it, expect } from 'vitest';
import { createScriptPattern, doStep, wait, fork, loopUntil } from '../content/patterns/util/scriptPattern';

describe('boss script engine fork/join & health predicate', () => {
  it('runs forked branches in parallel and joins after completion', () => {
    const events: string[] = [];
    const pattern = createScriptPattern({ id: 'fork', version: 1, steps: [
      fork([
        [doStep(()=>events.push('A1')), wait(2), doStep(()=>events.push('A2'))],
        [doStep(()=>events.push('B1')), wait(1), doStep(()=>events.push('B2'))]
      ]),
      doStep(()=>events.push('AfterJoin'))
    ]});
    const ctx: any = { frame:0 };
    pattern.start(ctx);
    for (let f=0; f<10; f++) { ctx.frame=f; pattern.update(1/60, ctx); }
    // Ensure ordering constraints: A1,B1 first frame (order may reflect branch array order processed); AfterJoin only after both A2 and B2.
    const afterIndex = events.indexOf('AfterJoin');
    expect(afterIndex).toBeGreaterThan(events.indexOf('A2'));
    expect(afterIndex).toBeGreaterThan(events.indexOf('B2'));
  });

  it('loopUntil with boss health predicate stops when threshold reached', () => {
    const events: number[] = [];
    const ctx: any = { frame:0 };
    // Mock health in ctx by mutating external object
    let health = 100;
    const pattern = createScriptPattern({ id: 'hp', version: 1, steps: [
      loopUntil(()=>health <= 50, [
        doStep(()=>{ events.push(health); health -= 10; }),
        wait(1)
      ])
    ]});
    pattern.start(ctx);
    for (let f=0; f<20; f++) { ctx.frame=f; if (pattern.update(1/60, ctx)) break; }
    expect(health).toBeLessThanOrEqual(50);
    expect(events.length).toBe(5); // 100,90,80,70,60 captured
  });
});
