import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { waitForFileDiscovery } from '../client/file-discovery.mjs';

describe('waitForFileDiscovery', () => {
  test('registers exactly one listener synchronously', { timeout: 6000 }, async (t) => {
    const listeners = [];
    const promise = waitForFileDiscovery(listeners);

    assert.equal(listeners.length, 1);
    assert.equal(typeof listeners[0], 'function');

    await promise;
  });
});
