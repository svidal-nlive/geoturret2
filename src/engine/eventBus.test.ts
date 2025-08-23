import { describe, it, expect } from 'vitest';
import { eventBus } from './eventBus';

describe('eventBus', () => {
  it('registers and emits events', () => {
  const received: number[] = [];
  // Use 'frame' core event for typed test; push frame numbers.
  const off = eventBus.on('frame', p => received.push(p.frame));
  eventBus.emit('frame', { frame: 1, time: 0 });
  eventBus.emit('frame', { frame: 2, time: 0.016 });
  off();
  eventBus.emit('frame', { frame: 3, time: 0.032 }); // should not be received
  expect(received).toEqual([1,2]);
  });

  it('clears listeners', () => {
    let count = 0;
    eventBus.on('a', () => { count++; });
    eventBus.clear();
    eventBus.emit('a', undefined);
    expect(count).toBe(0);
  });
});
