import { describe, it, expect } from 'vitest';
import { installErrorBoundary, getLoggedErrors, clearLoggedErrors } from './errorBoundary';

describe('error boundary ring buffer', () => {
  it('captures manual logged errors and enforces max size', () => {
    clearLoggedErrors();
    const handle = installErrorBoundary({ max: 5 });
    for (let i=0;i<12;i++) handle.logError(new Error('E'+i), i);
    const errs = getLoggedErrors();
    expect(errs.length).toBe(5);
    // Should contain last 5 (E7..E11)
    const messages = errs.map(e => e.message);
    expect(messages).toEqual(['E7','E8','E9','E10','E11']);
    // Frame stored
    expect(errs[0].frame).toBe(7);
  });

  it('allows clearing', () => {
    clearLoggedErrors();
    const handle = installErrorBoundary({ max: 3 });
    handle.logError('boom');
    expect(getLoggedErrors().length).toBe(1);
    clearLoggedErrors();
    expect(getLoggedErrors().length).toBe(0);
  });
});
