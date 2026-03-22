/**
 * bug-perf-008: Verify fetch() in checkForUpdate uses AbortSignal timeout.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkForUpdate } from '../client/update-check.mjs';

describe('BUG-PERF-008: checkForUpdate uses fetch timeout', () => {

  it('fetch is called with an AbortSignal', async () => {
    const originalFetch = globalThis.fetch;
    let signal = null;

    globalThis.fetch = (url, options) => {
      signal = options?.signal;
      return Promise.resolve({ ok: false });
    };

    globalThis.localStorage = {
      getItem: () => null,
      setItem: () => {}
    };

    try {
      await checkForUpdate('1.0.0');
      assert.ok(signal, 'fetch should be called with an AbortSignal');
      assert.ok(signal instanceof AbortSignal, 'signal should be an AbortSignal instance');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
