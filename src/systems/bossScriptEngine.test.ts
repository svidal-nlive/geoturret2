import { describe, it, expect } from 'vitest';
import { createScriptPattern, wait, doStep } from '../content/patterns/util/scriptPattern';

describe('boss script execution engine', () => {
  it('processes sequential do steps before completing and preserves ordering across waits', () => {
    const events: string[] = [];
    const pattern = createScriptPattern({
      id: 't', version: 1,
      steps: [
        doStep(() => events.push('a')),
        doStep(() => events.push('b')),
        wait(2),
        doStep(() => events.push('c'))
      ]
    });
    const ctx: any = { frame: 0 };
    pattern.start(ctx);
    // Advance frames until pattern completes (safety cap)
    for (let f=0; f<20; f++) {
      ctx.frame = f;
      const done = pattern.update(1/60, ctx);
      if (done) break;
    }
    expect(events[0]).toBe('a');
    expect(events[1]).toBe('b');
    // Final event should be 'c' and appear after a short wait window.
    expect(events.includes('c')).toBe(true);
    const idxC = events.indexOf('c');
    expect(idxC).toBeGreaterThan(1);
  });
});
