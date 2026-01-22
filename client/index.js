import React, { PureComponent } from 'react';
import { registerClientExtension } from 'camunda-modeler-plugin-helpers';

import CallActivityContextPadModule from './bpmn-extension';

class CallActivityNavigatorPlugin extends PureComponent {
  constructor(props) {
    super(props);

    const { subscribe, triggerAction, displayNotification, _getGlobal } = props;

    this._triggerAction = triggerAction;
    this._displayNotification = displayNotification;
    this._getGlobal = _getGlobal;
    this._activeTab = null;
    this._processIndex = new Map();
    this._indexedRoots = new Set();
    this._pendingFiles = [];
    this._isScanning = false;

    console.log('[CallActivityNavigator] Plugin initialized');

    const backend = _getGlobal('backend');
    this._backend = backend;

    backend.on('file-context:changed', (_, items) => {
      console.log('[CallActivityNavigator] file-context:changed, items:', items?.length);
      this._processFileContextItems(items || []);
    });

    subscribe('app.activeTabChanged', ({ activeTab }) => {
      this._activeTab = activeTab;

      if (activeTab?.file?.path) {
        this._ensureRootIndexed(activeTab.file.path);
      }
    });

    subscribe('bpmn.modeler.configure', ({ middlewares, tab }) => {
      console.log('[CallActivityNavigator] bpmn.modeler.configure for:', tab?.type);

      middlewares.push(config => {
        return {
          ...config,
          additionalModules: [
            ...(config.additionalModules || []),
            CallActivityContextPadModule
          ]
        };
      });
    });

    subscribe('bpmn.modeler.created', ({ modeler }) => {
      console.log('[CallActivityNavigator] bpmn.modeler.created');
      const eventBus = modeler.get('eventBus');

      eventBus.on('callActivity.openProcess', (event) => {
        console.log('[CallActivityNavigator] openProcess event:', event.processId);
        this._handleOpenProcess(event.processId);
      });
    });
  }

  _ensureRootIndexed(filePath) {
    const pathParts = filePath.split(/[/\\]/);

    let rootPath = null;
    const bpmnIndex = pathParts.findIndex(p => p === 'bpmn');
    if (bpmnIndex > 0) {
      rootPath = pathParts.slice(0, bpmnIndex + 1).join('/');
    } else {
      rootPath = pathParts.slice(0, -1).join('/');
    }

    if (rootPath && !this._indexedRoots.has(rootPath)) {
      console.log('[CallActivityNavigator] Adding root for indexing:', rootPath);
      this._indexedRoots.add(rootPath);
      this._backend.send('file-context:add-root', { filePath: rootPath });
    }
  }

  async _processFileContextItems(items) {
    const bpmnFiles = items.filter(item =>
      item.file?.path?.endsWith('.bpmn')
    );

    for (const item of bpmnFiles) {
      if (!this._processIndex.has(item.file.path)) {
        this._pendingFiles.push(item.file.path);
      }
    }

    if (!this._isScanning && this._pendingFiles.length > 0) {
      this._scanPendingFiles();
    }
  }

  async _scanPendingFiles() {
    if (this._isScanning || this._pendingFiles.length === 0) return;

    this._isScanning = true;
    const fileSystem = this._getGlobal('fileSystem');

    while (this._pendingFiles.length > 0) {
      const filePath = this._pendingFiles.shift();

      try {
        const file = await fileSystem.readFile(filePath);
        const content = file.contents;

        const processMatch = content.match(/<bpmn2?:process[^>]+id="([^"]+)"/);
        if (processMatch) {
          const processId = processMatch[1];
          this._processIndex.set(processId, { path: filePath });
          console.log('[CallActivityNavigator] Found process:', processId, 'in', filePath);
        }
      } catch (error) {
        // Ignore read errors
      }
    }

    this._isScanning = false;
    console.log('[CallActivityNavigator] Scan complete. Total processes:', this._processIndex.size);
  }

  _handleOpenProcess(processId) {
    const processInfo = this._processIndex.get(processId);

    if (processInfo) {
      console.log('[CallActivityNavigator] Opening:', processInfo.path);
      this._triggerAction('open-diagram', { path: processInfo.path });
      return;
    }

    this._displayNotification({
      type: 'warning',
      title: 'Process not found',
      content: `Could not find process "${processId}". Wait for scan to complete or check if file exists.`
    });
  }

  render() {
    return null;
  }
}

registerClientExtension(CallActivityNavigatorPlugin);
