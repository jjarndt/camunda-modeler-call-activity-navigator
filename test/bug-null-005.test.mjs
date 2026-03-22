/**
 * BUG-NULL-005: Verify waitForFileDiscovery handles null/undefined gracefully.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { waitForFileDiscovery } from '../client/file-discovery.mjs';

describe('BUG-NULL-005: waitForFileDiscovery handles invalid listeners', () => {
  it('resolves immediately when listeners is null', async () => {
    await assert.doesNotReject(() => waitForFileDiscovery(null));
  });

  it('resolves immediately when listeners is undefined', async () => {
    await assert.doesNotReject(() => waitForFileDiscovery(undefined));
  });
});
