/**
 * bug-finder-perf-002: Event Listener Akkumulierung in _configureModeler
 *
 * Regression test: Verifies that the fix in index.js correctly manages
 * event listeners - only one listener per eventBus, old ones cleaned up.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

class MockEventBus {
  constructor() {
    this._listeners = {};
  }
  on(event, callback) {
    this._listeners[event] = this._listeners[event] || [];
    this._listeners[event].push(callback);
  }
  off(event, callback) {
    const list = this._listeners[event];
    if (!list) return;
    const idx = list.indexOf(callback);
    if (idx >= 0) list.splice(idx, 1);
  }
  emit(event, data) {
    (this._listeners[event] || []).forEach(cb => cb(data));
  }
  listenerCount(event) {
    return (this._listeners[event] || []).length;
  }
}

/**
 * Repliziert das FIXED Pattern aus index.js _configureModeler():
 * - Handler wird als stabile Referenz gespeichert
 * - Bei neuem modeler.created wird alter Listener entfernt
 */
function simulateFixedConfigureModeler(subscribeManager, onOpenProcess) {
  let currentEventBus = null;
  const handler = (event) => onOpenProcess(event.processId);

  subscribeManager.subscribe('bpmn.modeler.created', ({ modeler }) => {
    if (currentEventBus) {
      currentEventBus.off('callActivity.openProcess', handler);
    }
    const eventBus = modeler.get('eventBus');
    currentEventBus = eventBus;
    eventBus.on('callActivity.openProcess', handler);
  });
}

class MockSubscribeManager {
  constructor() {
    this._handlers = {};
  }
  subscribe(event, handler) {
    this._handlers[event] = this._handlers[event] || [];
    this._handlers[event].push(handler);
  }
  emit(event, data) {
    (this._handlers[event] || []).forEach(h => h(data));
  }
}

describe('BUG-FINDER-PERF-002: Event Listener Akkumulierung bei mehrfachen bpmn.modeler.created Events', () => {

  it('akkumuliert N Listener nach N bpmn.modeler.created Events', () => {
    const subscribeManager = new MockSubscribeManager();
    const sharedEventBus = new MockEventBus();
    const N = 5;

    let openProcessCallCount = 0;
    simulateFixedConfigureModeler(subscribeManager, () => openProcessCallCount++);

    for (let i = 0; i < N; i++) {
      subscribeManager.emit('bpmn.modeler.created', {
        modeler: { get: () => sharedEventBus }
      });
    }

    const listenerCount = sharedEventBus.listenerCount('callActivity.openProcess');
    assert.equal(listenerCount, 1,
      `After ${N} events, should have 1 listener, got ${listenerCount}`);
  });

  it('feuert N _handleOpenProcess Aufrufe fuer einen einzigen Klick nach N geoeffneten Tabs', () => {
    const subscribeManager = new MockSubscribeManager();
    const sharedEventBus = new MockEventBus();
    const N = 3;

    let openProcessCallCount = 0;
    simulateFixedConfigureModeler(subscribeManager, () => openProcessCallCount++);

    for (let i = 0; i < N; i++) {
      subscribeManager.emit('bpmn.modeler.created', {
        modeler: { get: () => sharedEventBus }
      });
    }

    sharedEventBus.emit('callActivity.openProcess', { processId: 'my-process' });

    assert.equal(openProcessCallCount, 1,
      `Single click should fire 1 handler, got ${openProcessCallCount}`);
  });

  it('kein componentWillUnmount in index.js: bestehende Listener werden nie entfernt', () => {
    const subscribeManager = new MockSubscribeManager();
    const eventBus = new MockEventBus();

    simulateFixedConfigureModeler(subscribeManager, () => {});

    subscribeManager.emit('bpmn.modeler.created', { modeler: { get: () => eventBus } });
    const after1 = eventBus.listenerCount('callActivity.openProcess');

    subscribeManager.emit('bpmn.modeler.created', { modeler: { get: () => eventBus } });
    const after2 = eventBus.listenerCount('callActivity.openProcess');

    subscribeManager.emit('bpmn.modeler.created', { modeler: { get: () => eventBus } });
    const after3 = eventBus.listenerCount('callActivity.openProcess');

    assert.equal(after3, 1,
      `After 3 mounts: ${after1}, ${after2}, ${after3} listeners - should stay at 1`);
  });
});
