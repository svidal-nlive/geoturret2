export class Pool {
    opts;
    free = [];
    total = 0;
    created = 0;
    max;
    constructor(opts) {
        this.opts = opts;
        this.max = opts.max;
        for (let i = 0; i < opts.initial; i++)
            this.free.push(this.make());
    }
    make() { this.total++; this.created++; return this.opts.create(); }
    acquire() {
        if (this.free.length)
            return this.free.pop();
        if (this.max !== undefined && this.total >= this.max)
            return undefined;
        return this.make();
    }
    release(obj) {
        this.opts.reset?.(obj);
        this.free.push(obj);
    }
    stats() { return { size: this.total, free: this.free.length, inUse: this.total - this.free.length, created: this.created, max: this.max }; }
    preallocate(n) {
        for (let i = 0; i < n; i++) {
            if (this.max !== undefined && this.total >= this.max)
                break;
            this.free.push(this.make());
        }
    }
}
