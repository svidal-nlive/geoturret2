import { describe, it, expect } from 'vitest';
import { createGameState } from '../state/gameState';

// Ensure damage log maintains max 100 entries.

describe('bossDamageLog capacity', () => {
  it('keeps last 100 entries', () => {
    const state = createGameState();
    for (let i=0;i<150;i++) {
      state.bossDamageLog.push({ frame: i, amount: 1, source: 'playerBullet', hpAfter: 1000 - i });
      if (state.bossDamageLog.length > 100) state.bossDamageLog.splice(0, state.bossDamageLog.length - 100);
    }
    expect(state.bossDamageLog.length).toBe(100);
    expect(state.bossDamageLog[0].frame).toBe(50);
    expect(state.bossDamageLog[99].frame).toBe(149);
  });
});
