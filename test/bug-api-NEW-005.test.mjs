/**
 * BUG-API-NEW-005: checkForUpdate writes to localStorage BEFORE making the
 * fetch request. If the fetch fails or times out, the throttle timestamp
 * is already set, preventing retry for 24 hours.
 *
 * On line 66: localStorage.setItem(THROTTLE_KEY, String(Date.now()));
 * On line 68: const response = await fetch(RELEASES_URL, ...);
 *
 * If fetch throws (network error, DNS failure), the catch on line 85
 * returns NO_UPDATE. But localStorage already has the timestamp.
 * The user won't be able to check for updates again for 24 hours,
 * even though the check never actually completed.
 *
 * The throttle should be set AFTER a successful fetch, not before.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { checkForUpdate } from '../client/update-check.mjs';

// Mock localStorage and fetch for testing
const createMockEnv = () => {
  const storage = new Map();
  return {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    storage,
    fetchCallCount: 0,
  };
};

describe('BUG-API-NEW-005: checkForUpdate sets throttle before fetch completes', () => {

  it('throttle is set even when fetch throws a network error', async () => {
    const env = createMockEnv();

    // Install mocks
    globalThis.localStorage = env.localStorage;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      env.fetchCallCount++;
      throw new Error('Network error');
    };

    try {
      // First call - fetch will throw
      const result1 = await checkForUpdate('1.0.0');
      assert.deepStrictEqual(result1, { available: false });

      // BUG: localStorage now has the throttle timestamp even though
      // the fetch failed. The next call within 24h will be throttled.
      const throttleTimestamp = env.localStorage.getItem('callActivityNavigator.lastUpdateCheck');
      assert.strictEqual(throttleTimestamp, null,
        'Throttle timestamp should NOT be set when fetch fails - ' +
        `but it was set to ${throttleTimestamp}`);
    } finally {
      globalThis.fetch = originalFetch;
      delete globalThis.localStorage;
    }
  });

  it('second call within 24h is throttled even after first call failed', async () => {
    const env = createMockEnv();

    globalThis.localStorage = env.localStorage;
    const originalFetch = globalThis.fetch;

    // First call: fetch fails
    globalThis.fetch = async () => { throw new Error('Network error'); };

    try {
      await checkForUpdate('1.0.0');
      assert.strictEqual(env.fetchCallCount, 0,
        'fetchCallCount starts at 0 (mock replaces counter)');

      // Second call: fetch would succeed, but is it even called?
      let secondFetchCalled = false;
      globalThis.fetch = async () => {
        secondFetchCalled = true;
        return {
          ok: true,
          json: async () => ({
            tag_name: 'v2.0.0',
            html_url: 'https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/tag/v2.0.0'
          })
        };
      };

      const result2 = await checkForUpdate('1.0.0');

      // BUG: the second call is throttled because the first call
      // set the timestamp before the fetch failed
      assert.strictEqual(secondFetchCalled, true,
        'Second call should NOT be throttled when first call failed - fetch should be called');
      assert.strictEqual(result2.available, true,
        'Second call should detect the update since fetch succeeds');
    } finally {
      globalThis.fetch = originalFetch;
      delete globalThis.localStorage;
    }
  });
});
