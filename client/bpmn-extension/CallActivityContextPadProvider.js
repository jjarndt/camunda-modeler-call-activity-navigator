import { getCalledProcessId, isCallActivity } from './util.mjs';

const PROVIDER_PRIORITY = 900;

const OPEN_EXTERNAL_ICON = [
  '<div class="entry" style="display:flex;align-items:center;justify-content:center;">',
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">',
  '<path fill="#000" d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14',
  'a2 2 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>',
  '</svg></div>'
].join('');

export default class CallActivityContextPadProvider {
  constructor(contextPad, eventBus) {
    this._eventBus = eventBus;
    contextPad.registerProvider(PROVIDER_PRIORITY, this);
  }

  getContextPadEntries(element) {
    if (!isCallActivity(element)) {
      return {};
    }

    const processId = getCalledProcessId(element);

    if (!processId) {
      return {};
    }

    const eventBus = this._eventBus;

    return {
      'open-called-process': {
        group: 'edit',
        html: OPEN_EXTERNAL_ICON,
        title: `Open "${processId}"`,
        action: {
          click() {
            eventBus.fire('callActivity.openProcess', { processId });
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
