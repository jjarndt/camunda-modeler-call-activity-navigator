const DEBOUNCE_MS = 200;
const INITIAL_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 5000;

function removeListener(listeners, listener) {
  const idx = listeners.indexOf(listener);
  if (idx >= 0) listeners.splice(idx, 1);
}

export function waitForFileDiscovery(listeners) {
  return new Promise((resolve) => {
    let debounceTimer;
    const maxTimer = setTimeout(done, MAX_TIMEOUT_MS);

    function done() {
      clearTimeout(debounceTimer);
      clearTimeout(maxTimer);
      removeListener(listeners, onEvent);
      resolve();
    }

    function onEvent() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(done, DEBOUNCE_MS);
    }

    listeners.push(onEvent);

    // If no events arrive, give up after the initial timeout
    debounceTimer = setTimeout(done, INITIAL_TIMEOUT_MS);
  });
}
