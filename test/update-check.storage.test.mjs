import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { checkForUpdate } from '../client/update-check.mjs';

function teardownGlobals() {
  delete globalThis.localStorage;
  delete globalThis.fetch;
}

describe('checkForUpdate - localStorage errors', () => {
  it('returns NO_UPDATE when localStorage throws', async (t) => {
    t.after(teardownGlobals);

    globalThis.localStorage = {
      getItem: () => { throw new Error('localStorage disabled'); },
      setItem: () => {}
    };
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ tag_name: 'v9.0.0' })
    });

    const result = await checkForUpdate('1.0.0');

    assert.deepEqual(result, { available: false });
  });
});
