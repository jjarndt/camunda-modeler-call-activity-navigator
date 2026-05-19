import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createSerialQueue } from '../client/serial-queue.mjs';

describe('createSerialQueue - rejection isolation', () => {

  it('runs the next task even when the previous one rejects', async () => {
    const queue = createSerialQueue();
    let secondRan = false;

    const first = queue(() => Promise.reject(new Error('boom')));
    const second = queue(() => { secondRan = true; return 'ok'; });

    await assert.rejects(first, /boom/);
    assert.equal(await second, 'ok');
    assert.equal(secondRan, true);
  });

  it('preserves submission order across mixed success and rejection', async () => {
    const queue = createSerialQueue();
    const log = [];

    const a = queue(async () => { log.push('a:start'); await Promise.resolve(); log.push('a:end'); return 'a'; });
    const b = queue(async () => { log.push('b'); throw new Error('b-fail'); });
    const c = queue(async () => { log.push('c'); return 'c'; });

    assert.equal(await a, 'a');
    await assert.rejects(b, /b-fail/);
    assert.equal(await c, 'c');
    assert.deepEqual(log, [ 'a:start', 'a:end', 'b', 'c' ]);
  });

  it('returns the value of each task to its own caller', async () => {
    const queue = createSerialQueue();
    const results = await Promise.all([
      queue(() => 1),
      queue(() => Promise.resolve(2)),
      queue(() => 3),
    ]);
    assert.deepEqual(results, [ 1, 2, 3 ]);
  });

});
