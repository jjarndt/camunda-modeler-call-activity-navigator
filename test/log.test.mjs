import test from 'node:test';
import assert from 'node:assert/strict';

import { debug, warn, error } from '../client/log.mjs';

test('log functions prepend the correct prefix', (t) => {
  const mockDebug = t.mock.method(console, 'debug');
  const mockWarn = t.mock.method(console, 'warn');
  const mockError = t.mock.method(console, 'error');

  debug('test msg');
  warn('warning');
  error('err');

  assert.equal(mockDebug.mock.calls.length, 1);
  assert.deepEqual(mockDebug.mock.calls[0].arguments, ['[CallActivityNavigator]', 'test msg']);

  assert.equal(mockWarn.mock.calls.length, 1);
  assert.deepEqual(mockWarn.mock.calls[0].arguments, ['[CallActivityNavigator]', 'warning']);

  assert.equal(mockError.mock.calls.length, 1);
  assert.deepEqual(mockError.mock.calls[0].arguments, ['[CallActivityNavigator]', 'err']);
});
