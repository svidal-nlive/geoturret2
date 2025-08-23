/**
 * Error Boundary & Ring Buffer Logger (Phase 1 task).
 * Lightweight capture of runtime errors for later export / inspection.
 * Intended for dev builds; never transmits remotely.
 */
export interface LoggedError {
  message: string;
  stack?: string;
  time: number; // epoch ms
  frame?: number; // optional frame if provided by caller
  origin: 'manual' | 'error' | 'unhandledrejection';
}

interface ErrorBoundaryHandle {
  logError: (err: unknown, frame?: number) => void;
  getErrors: () => LoggedError[];
  clearErrors: () => void;
  size: () => number;
}

let buffer: LoggedError[] = [];
let maxSize = 50;
let installed = false;

function push(entry: LoggedError) {
  buffer.push(entry);
  if (buffer.length > maxSize) buffer.splice(0, buffer.length - maxSize);
}

export function installErrorBoundary(opts?: { max?: number }): ErrorBoundaryHandle {
  if (opts?.max) maxSize = opts.max;
  if (!installed && typeof window !== 'undefined') {
    window.addEventListener('error', ev => {
      push({ message: ev.message || 'ErrorEvent', stack: ev.error?.stack, time: Date.now(), origin: 'error' });
    });
    window.addEventListener('unhandledrejection', ev => {
      const reason: any = (ev as any).reason;
      push({ message: reason?.message || String(reason), stack: reason?.stack, time: Date.now(), origin: 'unhandledrejection' });
    });
    installed = true;
  }
  return {
    logError: (err: unknown, frame?: number) => {
      if (err instanceof Error) push({ message: err.message, stack: err.stack, time: Date.now(), frame, origin: 'manual' });
      else push({ message: String(err), time: Date.now(), frame, origin: 'manual' });
    },
    getErrors: () => buffer.slice(),
    clearErrors: () => { buffer = []; },
    size: () => buffer.length
  };
}

export function getLoggedErrors(): LoggedError[] { return buffer.slice(); }
export function clearLoggedErrors(): void { buffer = []; }
