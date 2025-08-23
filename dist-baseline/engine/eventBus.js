class EventBus {
    listeners = new Map();
    on(event, handler) {
        let set = this.listeners.get(event);
        if (!set) {
            set = new Set();
            this.listeners.set(event, set);
        }
        set.add(handler);
        return () => this.off(event, handler);
    }
    off(event, handler) {
        const set = this.listeners.get(event);
        if (set) {
            set.delete(handler);
            if (!set.size)
                this.listeners.delete(event);
        }
    }
    emit(event, payload) {
        const set = this.listeners.get(event);
        if (!set)
            return;
        [...set].forEach(h => { try {
            h(payload);
        }
        catch { } });
    }
    clear() { this.listeners.clear(); }
}
export const eventBus = new EventBus();
