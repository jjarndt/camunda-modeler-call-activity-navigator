import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { debug, warn, error } from '../client/log.mjs';

describe('log', () => {

  it('prepends the correct prefix for each log level', (t) => {
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

  it('passes through multiple arguments after prefix', (t) => {
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

  it('works with no arguments (prefix only)', (t) => {
    t.mock.method(console, 'debug');

    debug();

    assert.equal(console.debug.mock.calls.length, 1);
    assert.deepEqual(console.debug.mock.calls[0].arguments, [
      '[CallActivityNavigator]'
    ]);
  });

  it('passes through objects and errors by reference', (t) => {
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

});
