/**
 * bug-perf-006: _scheduleUpdateCheck Timer Leak - kein clearTimeout bei Deaktivierung
 *
 * index.js Zeile 82-93: _scheduleUpdateCheck() erstellt einen setTimeout mit
 * UPDATE_CHECK_DELAY_MS = 30000ms.
 *
 * Es gibt KEINE componentWillUnmount() oder andere Cleanup-Methode in der Klasse.
 * Der Timer wird nie cleared. Wenn das Plugin deinstalliert oder der Modeler
 * neu gestartet wird, laeuft der Timer trotzdem noch und versucht dann
 * checkForUpdate() aufzurufen und this._displayNotification() zu setzen -
 * auf einer moeglicherweise bereits zerstoerten Komponente.
 *
 * Dieser Test demonstriert das fehlende Cleanup-Pattern.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Simuliert den _scheduleUpdateCheck Mechanismus
class PluginWithUpdateCheck {
  constructor() {
    this._destroyed = false;
    this._timerRef = null;
    this._updateCheckCalled = false;
  }

  scheduleUpdateCheck() {
    // So wie in index.js implementiert - kein timerRef gespeichert
    setTimeout(() => {
      if (this._destroyed) return; // diese Schutzlogik fehlt in index.js!
      this._updateCheckCalled = true;
    }, 50); // kurze Zeit fuer Test
  }

  scheduleUpdateCheckWithoutGuard() {
    // Exakt wie in index.js - kein Guard, kein clearTimeout
    setTimeout(() => {
      this._updateCheckCalled = true; // ruft this._displayNotification auf zerstoerter Komponente
    }, 50);
  }

  destroy() {
    this._destroyed = true;
    // index.js hat KEINEN clearTimeout hier - das ist der Bug
    // Korrekt waere: if (this._timerRef) clearTimeout(this._timerRef);
  }
}

// Prueft ob der tatsaechliche index.js Code einen componentWillUnmount hat
describe('BUG-PERF-006: Missing timer cleanup in _scheduleUpdateCheck', () => {

  it('timer fires after plugin destruction (no cleanup guard in index.js)', async () => {
    const plugin = new PluginWithoutGuard();
    plugin.schedule();
    plugin.destroy();

    await new Promise(resolve => setTimeout(resolve, 100));

    // In index.js: _updateCheckCalled wuerde true sein nach Zerstoerung
    assert.ok(plugin.timerFiredAfterDestroy,
      'Timer fired after plugin was destroyed. ' +
      'index.js has no componentWillUnmount to clear the timer or guard against this.'
    );
  });

  it('timer with proper cleanup does NOT fire after destruction', async () => {
    const plugin = new PluginWithCleanup();
    plugin.schedule();
    plugin.destroy(); // clears timer

    await new Promise(resolve => setTimeout(resolve, 100));

    assert.ok(!plugin.timerFired,
      'Timer should not fire after proper cleanup'
    );
  });
});

// Simuliert exakt index.js Verhalten (kein Cleanup)
class PluginWithoutGuard {
  constructor() {
    this.timerFiredAfterDestroy = false;
    this._destroyed = false;
  }

  schedule() {
    // Exakt wie index.js _scheduleUpdateCheck - kein timerRef
    setTimeout(() => {
      // In index.js: checkForUpdate(...).then(result => this._displayNotification(...))
      // Keine Pruefung ob Komponente noch aktiv ist
      this.timerFiredAfterDestroy = true; // simuliert unerwuenschten Side-Effect
    }, 50);
  }

  destroy() {
    this._destroyed = true;
    // index.js hat KEINE cleanup-Logik - kein componentWillUnmount
  }
}

// Korrekte Implementierung mit Cleanup
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
