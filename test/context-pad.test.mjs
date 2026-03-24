import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCalledProcessId, isCallActivity } from '../client/bpmn-extension/util.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_PROCESS_ID = /^[a-zA-Z0-9_\-.:]+$/;

function makeCallActivityElement(calledElement) {
  return {
    type: 'bpmn:CallActivity',
    businessObject: {
      get(prop) {
        if (prop === 'calledElement') return calledElement;
        if (prop === 'extensionElements') return null;
        return null;
      }
    }
  };
}

// Simulate CallActivityContextPadProvider.getContextPadEntries logic
function getContextPadEntries(element) {
  if (!isCallActivity(element)) return {};
  const processId = getCalledProcessId(element);
  if (!processId) return {};

  return {
    'open-called-process': {
      group: 'edit',
      html: '<div class="entry">icon</div>',
      title: `Open "${processId}"`,
      action: { click() {} }
    }
  };
}

// ---------------------------------------------------------------------------
// XSS and unvalidated processId in context pad title
// ---------------------------------------------------------------------------

describe('context pad - processId in title attribute', () => {

  it('XSS payload in calledElement reaches title without validation', () => {
    const element = {
      type: 'bpmn:CallActivity',
      businessObject: {
        get(prop) {
          if (prop === 'calledElement') return '"><img src=x onerror=alert(1)>';
          if (prop === 'extensionElements') return null;
          return null;
        }
      }
    };

    const entries = getContextPadEntries(element);
    const title = entries['open-called-process'].title;

    assert.ok(title.includes('<img'),
      `Expected title to contain unescaped HTML, got: ${title}`);

    const processId = getCalledProcessId(element);
    assert.equal(VALID_PROCESS_ID.test(processId), false,
      'Payload fails VALID_PROCESS_ID but reaches ContextPad title unchecked');
  });

  it('Unicode/special chars in processId reach title unescaped', () => {
    const element = {
      type: 'bpmn:CallActivity',
      businessObject: {
        get(prop) {
          if (prop === 'calledElement') return 'process\u0000\u001B[31mRED';
          if (prop === 'extensionElements') return null;
          return null;
        }
      }
    };

    const entries = getContextPadEntries(element);
    const title = entries['open-called-process'].title;

    assert.ok(title.includes('\u0000'),
      'Null byte in processId reaches title unescaped');
  });

  it('template literal injection payload in processId', () => {
    const element = {
      type: 'bpmn:CallActivity',
      businessObject: {
        get(prop) {
          if (prop === 'calledElement') return '${alert(1)}';
          if (prop === 'extensionElements') return null;
          return null;
        }
      }
    };

    const processId = getCalledProcessId(element);
    assert.equal(processId, '${alert(1)}');
    assert.equal(VALID_PROCESS_ID.test(processId), false);
  });

  it('processId with double-quote breaks out of title attribute', () => {
    const xssId = 'test" onclick="alert(1)" data-x="';
    const element = makeCallActivityElement(xssId);

    assert.ok(isCallActivity(element));
    const processId = getCalledProcessId(element);

    assert.ok(processId.includes('"'));

    const title = `Open "${processId}"`;
    assert.ok(title.includes('onclick'),
      'XSS payload should be present in title string');
  });

  it('processId with HTML tags passes through to context pad', () => {
    const xssId = '<img src=x onerror=alert(1)>';
    const element = makeCallActivityElement(xssId);
    const processId = getCalledProcessId(element);

    assert.ok(processId.includes('<'));
    assert.ok(processId.includes('>'));

    const title = `Open "${processId}"`;
    assert.ok(title.includes('<img'));
  });

  it('SAFE_PROCESS_ID in bpmn-parser.mjs blocks HTML in extracted IDs', () => {
    const SAFE_PROCESS_ID = /^[^\s/\\<>"']+$/;
    assert.equal(SAFE_PROCESS_ID.test('<script>'), false);
    assert.equal(SAFE_PROCESS_ID.test('test"xss'), false);
    assert.equal(SAFE_PROCESS_ID.test("test'xss"), false);
    assert.equal(SAFE_PROCESS_ID.test('test xss'), false);
  });

  it('getCalledProcessId has NO filter - XSS payloads pass through', () => {
    const payloads = [
      '<script>alert(1)</script>',
      '" onmouseover="alert(1)',
      '\'><svg/onload=alert(1)>',
    ];

    for (const payload of payloads) {
      const element = makeCallActivityElement(payload);
      const result = getCalledProcessId(element);

      assert.ok(result === payload.trim(),
        `Expected payload to pass through, got: ${result}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Event listener accumulation
// ---------------------------------------------------------------------------

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

describe('context pad - event listener accumulation', () => {

  it('keeps only 1 listener after N bpmn.modeler.created events', () => {
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

  it('fires handler exactly once for a single click after N tabs opened', () => {
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

  it('listener count stays at 1 across multiple mount events', () => {
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
