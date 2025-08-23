import { globalRng } from './rng.js';
export function installRngShim() {
    if (Math._gt2ShimInstalled)
        return;
    const original = Math.random;
    Math._originalRandom = original;
    Math.random = () => globalRng.next();
    Math._gt2ShimInstalled = true;
}
