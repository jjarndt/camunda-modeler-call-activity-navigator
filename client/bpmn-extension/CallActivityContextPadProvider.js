import { getCalledProcessId, isCallActivity } from './util';

export default class CallActivityContextPadProvider {
  constructor(contextPad, eventBus) {
    this._contextPad = contextPad;
    this._eventBus = eventBus;

    console.log('[CallActivityNavigator] ContextPadProvider constructor called');

    contextPad.registerProvider(900, this);

    console.log('[CallActivityNavigator] Provider registered with priority 900');
  }

  getContextPadEntries(element) {
    console.log('[CallActivityNavigator] getContextPadEntries called for:', element?.type);

    if (!isCallActivity(element)) {
      return {};
    }

    const processId = getCalledProcessId(element);
    console.log('[CallActivityNavigator] CallActivity found, processId:', processId);

    if (!processId) {
      return {};
    }

    const self = this;

    return {
      'open-called-process': {
        group: 'edit',
        html: '<div class="entry" style="display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="#000" d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg></div>',
        title: `Open "${processId}"`,
        action: {
          click: function() {
            console.log('[CallActivityNavigator] Button clicked! processId:', processId);
            self._eventBus.fire('callActivity.openProcess', { processId });
          }
        }
      }
    };
  }
}

CallActivityContextPadProvider.$inject = [
  'contextPad',
  'eventBus'
];
