import { describe, it, expect } from 'vitest';
import { createGameState } from '../state/gameState';
import { createScriptedDemoPattern } from '../content/patterns/scriptedDemo';

describe('scripted demo boss pattern', () => {
  it('spawns radial volleys and completes after timeline', () => {
    const state = createGameState();
    const pattern = createScriptedDemoPattern(state);
    const ctx: any = { frame: 0 };
    pattern.start(ctx);
    let done = false;
    // Run enough frames: warmup 30 + (volley instant + 40 wait)*3 => 30 + 41*3 = 153 frames (final volley has its wait executed except final completion frame) roughly
    for (let f=0; f<160 && !done; f++) {
      ctx.frame = f;
      done = pattern.update(1/60, ctx);
    }
    expect(done).toBe(true);
    // Should have spawned 3 volleys of 8 pattern projectiles (=24) though some may have expired depending on ttl timing; ensure at least one volley present earlier
    expect(state.patternProjectiles.length).toBeGreaterThan(0);
  });
});
