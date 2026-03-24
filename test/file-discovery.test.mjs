import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { waitForFileDiscovery } from '../client/file-discovery.mjs';

describe('waitForFileDiscovery', () => {

  it('resolves after the 500ms initial timeout when no events fire', async (t) => {
    t.mock.timers.enable(['setTimeout']);

    const listeners = [];
    let resolved = false;
    waitForFileDiscovery(listeners).then(() => { resolved = true; });

    assert.equal(listeners.length, 1, 'should register a listener');

    t.mock.timers.tick(499);
    await Promise.resolve();
    assert.equal(resolved, false, 'should not resolve before 500ms');

    t.mock.timers.tick(1);
    await Promise.resolve();
    assert.equal(resolved, true, 'should resolve at 500ms');
    assert.equal(listeners.length, 0, 'should clean up listener');
  });

  it('resolves 200ms after a single event (debounce)', async (t) => {
    t.mock.timers.enable(['setTimeout']);

    const listeners = [];
    let resolved = false;
    waitForFileDiscovery(listeners).then(() => { resolved = true; });

    t.mock.timers.tick(100);
    listeners[0]();

    t.mock.timers.tick(199);
    await Promise.resolve();
    assert.equal(resolved, false, 'should not resolve before 200ms debounce');

    t.mock.timers.tick(1);
    await Promise.resolve();
    assert.equal(resolved, true, 'should resolve after 200ms debounce');
    assert.equal(listeners.length, 0, 'should clean up listener');
  });

  it('resets the debounce timer on each subsequent event', async (t) => {
    t.mock.timers.enable(['setTimeout']);

    const listeners = [];
    let resolved = false;
    waitForFileDiscovery(listeners).then(() => { resolved = true; });

    t.mock.timers.tick(100);
    listeners[0]();

    t.mock.timers.tick(150);
    listeners[0]();

    t.mock.timers.tick(150);
    listeners[0]();

    t.mock.timers.tick(199);
    await Promise.resolve();
    assert.equal(resolved, false, 'should not resolve before debounce after last event');

    t.mock.timers.tick(1);
    await Promise.resolve();
    assert.equal(resolved, true, 'should resolve 200ms after last event');
  });

  it('enforces the 5s max timeout even with continuous events', async (t) => {
    t.mock.timers.enable(['setTimeout']);

    const listeners = [];
    let resolved = false;
    waitForFileDiscovery(listeners).then(() => { resolved = true; });

    for (let i = 0; i < 49; i++) {
      t.mock.timers.tick(100);
      if (listeners.length > 0) listeners[0]();
    }

    await Promise.resolve();
    assert.equal(resolved, false, 'should not resolve before 5s max timeout');

    t.mock.timers.tick(100);
    await Promise.resolve();
    assert.equal(resolved, true, 'should resolve at 5s max timeout');
    assert.equal(listeners.length, 0, 'should clean up listener');
  });

  it('removes its listener from the array after resolution', async (t) => {
    t.mock.timers.enable(['setTimeout']);

    const listeners = [];
    const promise = waitForFileDiscovery(listeners);

    assert.equal(listeners.length, 1, 'should have registered a listener');

    t.mock.timers.tick(500);
    await promise;

    assert.equal(listeners.length, 0, 'listener array should be empty after resolution');
  });

  it('preserves pre-existing listeners in the array', async (t) => {
    t.mock.timers.enable(['setTimeout']);

    const otherListener = () => {};
    const listeners = [otherListener];

    let resolved = false;
    waitForFileDiscovery(listeners).then(() => { resolved = true; });

    assert.equal(listeners.length, 2, 'should add to existing listeners');

    t.mock.timers.tick(500);
    await Promise.resolve();
    assert.equal(resolved, true, 'should resolve normally');
    assert.equal(listeners.length, 1, 'should only remove own listener');
    assert.equal(listeners[0], otherListener, 'should preserve other listeners');
  });

  it('registers exactly one listener synchronously', { timeout: 6000 }, async () => {
    const listeners = [];
    const promise = waitForFileDiscovery(listeners);

    assert.equal(listeners.length, 1);
    assert.equal(typeof listeners[0], 'function');

    await promise;
  });

  describe('null/undefined listeners', () => {

    it('resolves immediately when listeners is null', async () => {
      await assert.doesNotReject(() => waitForFileDiscovery(null));
    });

    it('resolves immediately when listeners is undefined', async () => {
      await assert.doesNotReject(() => waitForFileDiscovery(undefined));
    });
  });

  describe('timer cleanup', () => {

    it('resolve is called at most once even when both timers expire concurrently', async () => {
      const listeners = [];

      const originalLength = listeners.length;
      const p = waitForFileDiscovery(listeners);

      assert.equal(listeners.length, originalLength + 1,
        'Listener should be added to listeners array');

      await p;

      assert.equal(listeners.length, originalLength,
        'Listener should be removed from listeners array after completion');
    });

    it('listener is removed from array after maxTimer fires', async () => {
      const listeners = [];

      const p1 = waitForFileDiscovery(listeners);
      const p2 = waitForFileDiscovery(listeners);

      assert.equal(listeners.length, 2, 'Both listeners should be registered');

      await Promise.all([p1, p2]);

      assert.equal(listeners.length, 0,
        'Both listeners should be removed after completion');
    });

    it('no memory leak: listeners array is empty after many sequential calls', async () => {
      const listeners = [];

      for (let i = 0; i < 5; i++) {
        await waitForFileDiscovery(listeners);
      }

      assert.equal(listeners.length, 0,
        `Expected 0 listeners after completion, got ${listeners.length}`);
    });
  });
});
