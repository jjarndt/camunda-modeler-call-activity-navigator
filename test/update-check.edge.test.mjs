import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { checkForUpdate } from '../client/update-check.mjs';

function setupGlobals({ fetchResponse, localStorage: storageData } = {}) {
  const storage = new Map(Object.entries(storageData || {}));
  globalThis.localStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, v)
  };
  globalThis.fetch = async () => fetchResponse;
}

function teardownGlobals() {
  delete globalThis.localStorage;
  delete globalThis.fetch;
}

describe('checkForUpdate - null tag_name', () => {
  it('handles response with null tag_name', async (t) => {
    t.after(teardownGlobals);
    setupGlobals({
      fetchResponse: {
        ok: true,
        json: async () => ({ tag_name: null, html_url: 'https://example.com' })
      }
    });

    const result = await checkForUpdate('1.0.0');

    assert.deepEqual(result, { available: false });
  });
});
