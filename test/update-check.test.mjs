import test from 'node:test';
import assert from 'node:assert/strict';

import { isNewerVersion, checkForUpdate } from '../client/update-check.mjs';

// --- isNewerVersion ---

test('isNewerVersion returns true when latest is higher major', () => {
  assert.equal(isNewerVersion('1.0.0', '2.0.0'), true);
});

test('isNewerVersion returns true when latest is higher minor', () => {
  assert.equal(isNewerVersion('1.2.0', '1.3.0'), true);
});

test('isNewerVersion returns true when latest is higher patch', () => {
  assert.equal(isNewerVersion('1.2.1', '1.2.2'), true);
});

test('isNewerVersion returns false when versions are equal', () => {
  assert.equal(isNewerVersion('1.2.1', '1.2.1'), false);
});

test('isNewerVersion returns false when current is newer', () => {
  assert.equal(isNewerVersion('2.0.0', '1.9.9'), false);
});

test('isNewerVersion handles missing patch segment', () => {
  assert.equal(isNewerVersion('1.0', '1.0.1'), true);
});

test('isNewerVersion strips pre-release suffix before comparing', () => {
  assert.equal(isNewerVersion('1.2.3-beta.1', '1.2.4'), true);
});

test('isNewerVersion ignores pre-release on both sides', () => {
  assert.equal(isNewerVersion('1.2.3-rc.1', '1.2.3-rc.2'), false);
});

// --- checkForUpdate ---

function setupGlobals({ fetchResponse, localStorage: storageData } = {}) {
  const storage = new Map(Object.entries(storageData || {}));
  globalThis.localStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, v)
  };
  globalThis.fetch = async () => fetchResponse;
  return storage;
}

function teardownGlobals() {
  delete globalThis.localStorage;
  delete globalThis.fetch;
}

test('checkForUpdate returns available when newer version exists', async (t) => {
  t.after(teardownGlobals);
  setupGlobals({
    fetchResponse: {
      ok: true,
      json: async () => ({ tag_name: 'v2.0.0', html_url: 'https://example.com/release' })
    }
  });

  const result = await checkForUpdate('1.0.0');

  assert.deepEqual(result, {
    available: true,
    latest: '2.0.0',
    url: 'https://example.com/release'
  });
});

test('checkForUpdate returns not available when on latest version', async (t) => {
  t.after(teardownGlobals);
  setupGlobals({
    fetchResponse: {
      ok: true,
      json: async () => ({ tag_name: 'v1.2.1', html_url: 'https://example.com' })
    }
  });

  const result = await checkForUpdate('1.2.1');

  assert.deepEqual(result, { available: false });
});

test('checkForUpdate returns not available on fetch error', async (t) => {
  t.after(teardownGlobals);
  setupGlobals({
    fetchResponse: { ok: false }
  });

  const result = await checkForUpdate('1.0.0');

  assert.deepEqual(result, { available: false });
});

test('checkForUpdate skips fetch when checked within last day', async (t) => {
  t.after(teardownGlobals);
  let fetchCalled = false;
  setupGlobals({
    fetchResponse: { ok: true, json: async () => ({ tag_name: 'v9.0.0' }) },
    localStorage: { 'callActivityNavigator.lastUpdateCheck': String(Date.now()) }
  });
  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => { fetchCalled = true; return origFetch(); };

  const result = await checkForUpdate('1.0.0');

  assert.deepEqual(result, { available: false });
  assert.equal(fetchCalled, false);
});

test('checkForUpdate calls fetch when last check was over a day ago', async (t) => {
  t.after(teardownGlobals);
  let fetchCalled = false;
  const oneDayAgo = Date.now() - 25 * 60 * 60 * 1000;
  setupGlobals({
    fetchResponse: {
      ok: true,
      json: async () => ({ tag_name: 'v3.0.0', html_url: 'https://example.com' })
    },
    localStorage: { 'callActivityNavigator.lastUpdateCheck': String(oneDayAgo) }
  });
  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => { fetchCalled = true; return origFetch(); };

  const result = await checkForUpdate('1.0.0');

  assert.equal(fetchCalled, true);
  assert.equal(result.available, true);
});

test('checkForUpdate stores timestamp in localStorage', async (t) => {
  t.after(teardownGlobals);
  const storage = setupGlobals({
    fetchResponse: {
      ok: true,
      json: async () => ({ tag_name: 'v1.0.0' })
    }
  });

  await checkForUpdate('1.0.0');

  const stored = storage.get('callActivityNavigator.lastUpdateCheck');
  assert.ok(stored);
  assert.ok(Math.abs(Date.now() - Number(stored)) < 5000);
});

test('checkForUpdate handles network exception gracefully', async (t) => {
  t.after(teardownGlobals);
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {}
  };
  globalThis.fetch = async () => { throw new Error('network down'); };

  const result = await checkForUpdate('1.0.0');

  assert.deepEqual(result, { available: false });
});

test('checkForUpdate strips v prefix from tag_name', async (t) => {
  t.after(teardownGlobals);
  setupGlobals({
    fetchResponse: {
      ok: true,
      json: async () => ({ tag_name: 'v5.1.0', html_url: 'https://example.com' })
    }
  });

  const result = await checkForUpdate('1.0.0');

  assert.equal(result.latest, '5.1.0');
});

test('checkForUpdate returns not available when tag_name is empty string', async (t) => {
  t.after(teardownGlobals);
  setupGlobals({
    fetchResponse: {
      ok: true,
      json: async () => ({ tag_name: '', html_url: 'https://example.com' })
    }
  });

  const result = await checkForUpdate('1.0.0');

  assert.deepEqual(result, { available: false });
});

test('checkForUpdate returns not available when tag_name is missing from response', async (t) => {
  t.after(teardownGlobals);
  setupGlobals({
    fetchResponse: {
      ok: true,
      json: async () => ({ html_url: 'https://example.com' })
    }
  });

  const result = await checkForUpdate('1.0.0');

  assert.deepEqual(result, { available: false });
});

test('checkForUpdate returns not available when response JSON parsing fails', async (t) => {
  t.after(teardownGlobals);
  setupGlobals({
    fetchResponse: {
      ok: true,
      json: async () => { throw new SyntaxError('Unexpected token'); }
    }
  });

  const result = await checkForUpdate('1.0.0');

  assert.deepEqual(result, { available: false });
});
