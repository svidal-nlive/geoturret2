import { describe, it, expect } from 'vitest';
import './initialContent';
import { Registries } from './registries';

// Lock file for registry composition (ids only). Update EXPECTED_HASH intentionally when adding/removing ids.
// Compute via: node scripts/print-registry-hash.mjs (to be added) or replicate hash logic.
const EXPECTED_HASH = 'a74727e9';

describe('Registries hash lock', () => {
  it('matches expected stable hash', () => {
    expect(Registries.hash()).toBe(EXPECTED_HASH);
  });
});
