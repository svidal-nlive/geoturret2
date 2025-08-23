export class RNG {
    state;
    constructor(seed) {
        if (typeof seed === 'string') {
            let h = 5381;
            for (let i = 0; i < seed.length; i++) {
                h = ((h << 5) + h) ^ seed.charCodeAt(i);
            }
            this.state = h >>> 0;
        }
        else {
            this.state = seed >>> 0;
        }
        if (this.state === 0)
            this.state = 0x1;
    }
    next() {
        this.state = (1664525 * this.state + 1013904223) >>> 0;
        return this.state / 0x100000000;
    }
    int(min, max) {
        if (max < min)
            throw new Error('RNG.int: max < min');
        const span = max - min + 1;
        return min + Math.floor(this.next() * span);
    }
    choice(arr) {
        if (!arr.length)
            throw new Error('RNG.choice: empty array');
        return arr[this.int(0, arr.length - 1)];
    }
    snapshot() { return this.state; }
    restore(state) { this.state = state >>> 0 || 0x1; }
}
export const globalRng = new RNG('geoturret2-seed');
