import test from 'node:test';
import assert from 'node:assert/strict';

import { warn } from '../client/log.mjs';

test('log functions pass through objects and errors as arguments', (t) => {
  const mockWarn = t.mock.method(console, 'warn');

  const err = new Error('test error');
  const data = { file: '/a.bpmn', line: 42 };

  warn('parsing failed', data, err);

  assert.equal(mockWarn.mock.calls.length, 1);

  const args = mockWarn.mock.calls[0].arguments;
  assert.deepEqual(args, ['[CallActivityNavigator]', 'parsing failed', data, err]);

  assert.ok(args[2] === data && args[3] === err,
    'data and err must be passed by reference (same object identity)');
});
