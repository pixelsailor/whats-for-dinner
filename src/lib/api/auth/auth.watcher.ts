/**
 * @fileoverview Monitors user return events (wake from sleep, window focus, visibility, navigation)
 * to ensure auth state stays synchronized with real-world time.
 * @module lib/api/auth/auth.watcher
 */

export type ReturnWatcherOptions = {
  /** Callback fired when user return or system wake is detected */
  onReturn: () => void | Promise<void>;
  /** Heartbeat interval in milliseconds to check for clock drift (sleep/wake). Default 5000ms. */
  heartbeatIntervalMs?: number;
  /** Drift threshold in milliseconds beyond interval indicating system suspend. Default 5000ms. */
  driftThresholdMs?: number;
  /** Debounce window in milliseconds to collapse rapid clustered wake events. Default 300ms. */
  debounceMs?: number;
};

/**
 * Creates a watcher that detects when a user returns to the application
 * (system wake from sleep, window focus, tab visibility change, or pageshow).
 *
 * @returns Cleanup function to tear down listeners and timers.
 */
export function createReturnWatcher(options: ReturnWatcherOptions): () => void {
  const {
    onReturn,
    heartbeatIntervalMs = 5000,
    driftThresholdMs = 5000,
    debounceMs = 300
  } = options;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastTick = Date.now();

  function trigger() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void onReturn();
    }, debounceMs);
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      trigger();
    }
  }

  function handleFocus() {
    trigger();
  }

  function handlePageShow() {
    trigger();
  }

  // Heartbeat to detect system suspend/resume (timer drift)
  const intervalId = setInterval(() => {
    const now = Date.now();
    const elapsed = now - lastTick;
    lastTick = now;

    if (elapsed > heartbeatIntervalMs + driftThresholdMs) {
      // System was asleep or event loop paused for significantly longer than expected
      trigger();
    }
  }, heartbeatIntervalMs);

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('pageshow', handlePageShow);

  return () => {
    clearInterval(intervalId);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('pageshow', handlePageShow);
  };
}
