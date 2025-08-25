import { describe, it, expect } from 'vitest';
import { createScriptPattern, doStep, wait, fork } from '../content/patterns/util/scriptPattern';

describe('boss script engine nested fork duplication check', () => {
  it('emits terminal after step exactly once in continuous run', () => {
    const events: string[] = [];
    const pattern: any = createScriptPattern({ id: 'nested-fork-dupe', version: 1, steps: [
      doStep(()=>events.push('root-start')),
      fork([
        [ doStep(()=>events.push('A1')), fork([[ doStep(()=>events.push('A2a')), wait(1), doStep(()=>events.push('A2b')) ], [ doStep(()=>events.push('A3a')), wait(2), doStep(()=>events.push('A3b')) ]]), doStep(()=>events.push('A4')) ],
        [ doStep(()=>events.push('B1')), wait(1), doStep(()=>events.push('B2')) ]
      ]),
      doStep(()=>events.push('after'))
    ]});
    const ctx: any = { frame: 0 };
    pattern.start(ctx);
    for (let f=0; f<100; f++) { ctx.frame = f; if (pattern.update(1/60, ctx)) break; }
    const afterCount = events.filter(e=>e==='after').length;
    expect(afterCount).toBe(1);
  });
});
