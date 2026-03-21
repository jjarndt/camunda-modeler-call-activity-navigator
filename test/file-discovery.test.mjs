import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { waitForFileDiscovery } from '../client/file-discovery.mjs';

const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
const skipMockTimers = nodeMajor < 20 ? 'Mock timers unreliable on Node < 20' : false;

describe('waitForFileDiscovery', () => {

  test('resolves after the 500ms initial timeout when no events fire', { skip: skipMockTimers }, async (t) => {
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

  test('resolves 200ms after a single event (debounce)', { skip: skipMockTimers }, async (t) => {
    t.mock.timers.enable(['setTimeout']);

    const listeners = [];
    let resolved = false;
    waitForFileDiscovery(listeners).then(() => { resolved = true; });

    // Fire event at t=100 (before initial 500ms timeout)
    t.mock.timers.tick(100);
    listeners[0]();

    // 199ms after event - not yet resolved
    t.mock.timers.tick(199);
    await Promise.resolve();
    assert.equal(resolved, false, 'should not resolve before 200ms debounce');

    // 1 more ms = 200ms debounce elapsed
    t.mock.timers.tick(1);
    await Promise.resolve();
    assert.equal(resolved, true, 'should resolve after 200ms debounce');
    assert.equal(listeners.length, 0, 'should clean up listener');
  });

  test('resets the debounce timer on each subsequent event', { skip: skipMockTimers }, async (t) => {
    t.mock.timers.enable(['setTimeout']);

    const listeners = [];
    let resolved = false;
    waitForFileDiscovery(listeners).then(() => { resolved = true; });

    // Fire events at t=100, t=250, t=400
    t.mock.timers.tick(100);
    listeners[0]();

    t.mock.timers.tick(150); // t=250
    listeners[0]();

    t.mock.timers.tick(150); // t=400
    listeners[0]();

    // 199ms after last event (t=599) - not resolved
    t.mock.timers.tick(199);
    await Promise.resolve();
    assert.equal(resolved, false, 'should not resolve before debounce after last event');

    // t=600 - 200ms after last event
    t.mock.timers.tick(1);
    await Promise.resolve();
    assert.equal(resolved, true, 'should resolve 200ms after last event');
  });

  test('enforces the 5s max timeout even with continuous events', { skip: skipMockTimers }, async (t) => {
    t.mock.timers.enable(['setTimeout']);

    const listeners = [];
    let resolved = false;
    waitForFileDiscovery(listeners).then(() => { resolved = true; });

    // Fire events every 100ms to prevent debounce from resolving
    for (let i = 0; i < 49; i++) {
      t.mock.timers.tick(100); // t=100..4900
      if (listeners.length > 0) listeners[0]();
    }

    await Promise.resolve();
    assert.equal(resolved, false, 'should not resolve before 5s max timeout');

    // Tick to t=5000 - max timeout fires
    t.mock.timers.tick(100);
    await Promise.resolve();
    assert.equal(resolved, true, 'should resolve at 5s max timeout');
    assert.equal(listeners.length, 0, 'should clean up listener');
  });

  test('removes its listener from the array after resolution', { skip: skipMockTimers }, async (t) => {
    t.mock.timers.enable(['setTimeout']);

    const listeners = [];
    const promise = waitForFileDiscovery(listeners);

    assert.equal(listeners.length, 1, 'should have registered a listener');

    t.mock.timers.tick(500);
    await promise;

    assert.equal(listeners.length, 0, 'listener array should be empty after resolution');
  });

  test('preserves pre-existing listeners in the array', { skip: skipMockTimers }, async (t) => {
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
});
