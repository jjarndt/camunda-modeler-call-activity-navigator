// Serializes async tasks so they execute in submission order.
// A rejected task must not cancel queued successors: we swallow the previous
// task's rejection inside the chain so the next fn() still runs. The caller
// of each individual queue() invocation still observes its own task's outcome.
export function createSerialQueue() {
  let pending = null;
  return async (fn) => {
    const previous = pending;
    const current = (async () => {
      if (previous) {
        try { await previous; } catch { /* isolate failures between tasks */ }
      }
      return fn();
    })();
    pending = current;
    try {
      return await current;
    } finally {
      if (pending === current) {
        pending = null;
      }
    }
  };
}
