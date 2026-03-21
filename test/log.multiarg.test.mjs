import test from 'node:test';
import assert from 'node:assert/strict';

import { error } from '../client/log.mjs';

test('log functions pass through multiple arguments after prefix', (t) => {
  t.mock.method(console, 'error');

  error('failed to load', '/path/to/file.bpmn', 42);

  assert.equal(console.error.mock.calls.length, 1);
  assert.deepEqual(console.error.mock.calls[0].arguments, [
    '[CallActivityNavigator]',
    'failed to load',
    '/path/to/file.bpmn',
    42
  ]);
});
