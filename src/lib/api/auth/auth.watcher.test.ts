import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createReturnWatcher } from './auth.watcher';

class MockTarget extends EventTarget {
  visibilityState = 'visible';
}

describe('createReturnWatcher', () => {
  let mockWindow: MockTarget;
  let mockDocument: MockTarget;

  beforeEach(() => {
    vi.useFakeTimers();
    mockWindow = new MockTarget();
    mockDocument = new MockTarget();

    vi.stubGlobal('window', mockWindow);
    vi.stubGlobal('document', mockDocument);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('triggers onReturn when window fires focus', () => {
    const onReturn = vi.fn();
    const cleanup = createReturnWatcher({
      onReturn,
      debounceMs: 50
    });

    mockWindow.dispatchEvent(new Event('focus'));
    expect(onReturn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(onReturn).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('triggers onReturn when document visibility changes to visible', () => {
    const onReturn = vi.fn();
    const cleanup = createReturnWatcher({
      onReturn,
      debounceMs: 50
    });

    mockDocument.visibilityState = 'visible';
    mockDocument.dispatchEvent(new Event('visibilitychange'));

    vi.advanceTimersByTime(50);
    expect(onReturn).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('does not trigger onReturn when document visibility is hidden', () => {
    const onReturn = vi.fn();
    const cleanup = createReturnWatcher({
      onReturn,
      debounceMs: 50
    });

    mockDocument.visibilityState = 'hidden';
    mockDocument.dispatchEvent(new Event('visibilitychange'));

    vi.advanceTimersByTime(100);
    expect(onReturn).not.toHaveBeenCalled();

    cleanup();
  });

  it('debounces rapid clustered wake events into a single invocation', () => {
    const onReturn = vi.fn();
    const cleanup = createReturnWatcher({
      onReturn,
      debounceMs: 100
    });

    mockDocument.visibilityState = 'visible';

    // Fire focus, visibilitychange, and pageshow rapidly
    mockWindow.dispatchEvent(new Event('focus'));
    mockDocument.dispatchEvent(new Event('visibilitychange'));
    mockWindow.dispatchEvent(new Event('pageshow'));

    vi.advanceTimersByTime(50);
    expect(onReturn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(onReturn).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('detects clock drift indicating system sleep and triggers onReturn', () => {
    const onReturn = vi.fn();
    let mockNow = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => mockNow);

    const cleanup = createReturnWatcher({
      onReturn,
      heartbeatIntervalMs: 5000,
      driftThresholdMs: 5000,
      debounceMs: 50
    });

    // Advance clock past threshold as if suspended
    mockNow += 2 * 60 * 60 * 1000;
    vi.advanceTimersByTime(5000);

    // Debounce fires
    vi.advanceTimersByTime(50);
    expect(onReturn).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('cleans up listeners and timer on cleanup call', () => {
    const onReturn = vi.fn();
    const cleanup = createReturnWatcher({
      onReturn,
      debounceMs: 50
    });

    cleanup();

    mockWindow.dispatchEvent(new Event('focus'));
    vi.advanceTimersByTime(100);
    expect(onReturn).not.toHaveBeenCalled();
  });
});
