// Simple deterministic simulation placeholder (Phase 1 harness stub)
// Currently just advances RNG for fixed iterations and prints a hash.
import { globalRng, RNG } from '../src/engine/rng.js';

function hashNumbers(nums) {
  let h = 2166136261 >>> 0; // FNV-1a 32-bit
  for (const n of nums) {
    // convert float to 32-bit int representation
    const x = Math.floor(n * 0xFFFFFFFF) >>> 0;
    h ^= x;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}

const seed = process.env.SIM_SEED || 'alpha-seed';
const rng = seed === 'global' ? globalRng : new RNG(seed);
const samples = 10_000;
const out = [];
for (let i = 0; i < samples; i++) out.push(rng.next());
console.log(JSON.stringify({ seed, samples, hash: hashNumbers(out) }, null, 2));
