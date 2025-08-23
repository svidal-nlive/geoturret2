/** RNG shim (Phase 1 P1-14) – temporary wrapper for legacy Math.random sites. */
import { globalRng } from './rng';
// Only apply once per session; caller opt-in.
export function installRngShim() {
  if ((Math as any)._gt2ShimInstalled) return;
  const original = Math.random;
  (Math as any)._originalRandom = original;
  Math.random = () => globalRng.next();
  (Math as any)._gt2ShimInstalled = true;
}
