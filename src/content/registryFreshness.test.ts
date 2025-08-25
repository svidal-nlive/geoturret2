import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import './initialContent';
import { Registries } from './registries';

/** Ensures artifacts/registry-summary.md reflects current IDs (fail if stale). */

describe('registry summary freshness', () => {
  it('artifact lists all current ids', () => {
    const summaryPath = path.resolve('artifacts/registry-summary.md');
    expect(fs.existsSync(summaryPath)).toBe(true);
    const md = fs.readFileSync(summaryPath,'utf8');
    const snap = Registries.snapshot();
    const allIds = [...snap.enemies, ...snap.powerups, ...snap.upgrades, ...snap.waveMods, ...snap.bossPatterns];
    for (const id of allIds) {
      expect(md.includes(`| ${id} |`)).toBe(true);
    }
  });
});
