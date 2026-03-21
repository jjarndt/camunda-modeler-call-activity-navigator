import test from 'node:test';
import assert from 'node:assert/strict';

import { debug } from '../client/log.mjs';

test('log functions work with no arguments (prefix only)', (t) => {
  t.mock.method(console, 'debug');

  debug();

  assert.equal(console.debug.mock.calls.length, 1);
  assert.deepEqual(console.debug.mock.calls[0].arguments, [
    '[CallActivityNavigator]'
  ]);
});
