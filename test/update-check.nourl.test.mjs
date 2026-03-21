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

describe('checkForUpdate', () => {
  it('returns undefined url when html_url is missing from response', async (t) => {
    setupGlobals({
      fetchResponse: {
        ok: true,
        json: async () => ({ tag_name: 'v2.0.0' })
      }
    });

    t.after(() => teardownGlobals());

    const result = await checkForUpdate('1.0.0');

    assert.deepStrictEqual(result, {
      available: true,
      latest: '2.0.0',
      url: undefined
    });
  });
});
