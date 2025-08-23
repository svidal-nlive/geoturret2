import { describe, it, expect } from 'vitest';
import { recordRun, replayRun } from './replay';

describe('replay harness', () => {
  it('replays a recorded run identically', () => {
    const rec = recordRun({ seed: 'replay-seed', duration: 6 });
    const result = replayRun(rec);
    expect(result.ok).toBe(true);
    expect(result.differences).toEqual([]);
  });

  it('detects divergence if tampered', () => {
    const rec = recordRun({ seed: 'replay-seed-2', duration: 4 });
    // Tamper kills to force diff
    (rec as any).kills += 1;
    const result = replayRun(rec);
    expect(result.ok).toBe(false);
    expect(result.differences.some(d => d.includes('kills mismatch'))).toBe(true);
  });
});
