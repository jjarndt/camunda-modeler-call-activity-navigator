import test from 'node:test';
import assert from 'node:assert/strict';

import { isNewerVersion } from '../client/update-check.mjs';

test('isNewerVersion strips build metadata (+build) before comparing', () => {
  assert.equal(isNewerVersion('1.2.3+build.123', '1.2.4+build.456'), true);
  assert.equal(isNewerVersion('1.2.3+build.123', '1.2.3+build.456'), false);
  assert.equal(isNewerVersion('2.0.0+metadata', '1.9.9+metadata'), false);
  assert.equal(isNewerVersion('1.0.0-beta+exp.sha', '1.0.1'), true);
});
