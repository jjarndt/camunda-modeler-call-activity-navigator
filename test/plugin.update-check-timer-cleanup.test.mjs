import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Simulates index.js behavior (no cleanup)
class PluginWithoutGuard {
  constructor() {
    this.timerFiredAfterDestroy = false;
    this._destroyed = false;
  }

  schedule() {
    setTimeout(() => {
      this.timerFiredAfterDestroy = true;
    }, 50);
  }

  destroy() {
    this._destroyed = true;
  }
}

// Correct implementation with cleanup
class PluginWithCleanup {
  constructor() {
    this.timerFired = false;
    this._timerRef = null;
  }

  schedule() {
    this._timerRef = setTimeout(() => {
      this.timerFired = true;
    }, 50);
  }

  destroy() {
    if (this._timerRef) {
      clearTimeout(this._timerRef);
      this._timerRef = null;
    }
  }
}

describe('_scheduleUpdateCheck timer cleanup', () => {

  it('timer fires after plugin destruction when no cleanup guard exists', async () => {
    const plugin = new PluginWithoutGuard();
    plugin.schedule();
    plugin.destroy();

    await new Promise(resolve => setTimeout(resolve, 100));

    assert.ok(plugin.timerFiredAfterDestroy,
      'Timer fired after plugin was destroyed');
  });

  it('timer with proper cleanup does NOT fire after destruction', async () => {
    const plugin = new PluginWithCleanup();
    plugin.schedule();
    plugin.destroy();

    await new Promise(resolve => setTimeout(resolve, 100));

    assert.ok(!plugin.timerFired,
      'Timer should not fire after proper cleanup');
  });
});
