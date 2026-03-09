/**
 * Wait for file discovery to settle by listening for events with debounce.
 *
 * @param {Function[]} listeners - Mutable array of event listeners
 * @returns {Promise<void>} Resolves when discovery has settled
 */
export function waitForFileDiscovery(listeners) {
  return new Promise((resolve) => {
    let debounceTimer;
    const maxTimer = setTimeout(done, 5000);

    function done() {
      clearTimeout(debounceTimer);
      clearTimeout(maxTimer);
      const idx = listeners.indexOf(onEvent);
      if (idx >= 0) listeners.splice(idx, 1);
      resolve();
    }

    function onEvent() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(done, 200);
    }

    listeners.push(onEvent);

    // Falls gar keine Events kommen: nach 500ms aufgeben
    debounceTimer = setTimeout(done, 500);
  });
}
