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
    this._indexingDeferred = true;
    this._perfStartup = Date.now();

    console.log('[CallActivityNavigator] Plugin initialized at', new Date(this._perfStartup).toISOString());

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

    // Kein automatischer Scan mehr - nur Dateien sammeln (Lazy Indexing)
  }

  async _scanPendingFiles() {
    if (this._isScanning || this._pendingFiles.length === 0) return;

    this._isScanning = true;
    const fileSystem = this._getGlobal('fileSystem');
    const scanStart = Date.now();

    // Alle pending files auf einmal holen
    const filesToScan = [...this._pendingFiles];
    this._pendingFiles = [];

    const BATCH_SIZE = 50; // Verhindert Memory-Spikes

    for (let i = 0; i < filesToScan.length; i += BATCH_SIZE) {
      const batch = filesToScan.slice(i, i + BATCH_SIZE);

      // Parallele Reads mit Promise.allSettled
      const results = await Promise.allSettled(
        batch.map(async (filePath) => {
          const file = await fileSystem.readFile(filePath);
          const content = file.contents;
          const processMatch = content.match(/<bpmn2?:process[^>]+id="([^"]+)"/);
          return { filePath, processMatch };
        })
      );

      // Ergebnisse verarbeiten
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.processMatch) {
          const { filePath, processMatch } = result.value;
          const processId = processMatch[1];
          this._processIndex.set(processId, { path: filePath });
          console.log('[CallActivityNavigator] Found process:', processId, 'in', filePath);
        }
      });
    }

    this._isScanning = false;
    const scanDuration = Date.now() - scanStart;
    console.log(`[CallActivityNavigator] Scan completed in ${scanDuration}ms, ${this._processIndex.size} processes, ${filesToScan.length} files`);
  }

  async _handleOpenProcess(processId) {
    console.log('[CallActivityNavigator] _handleOpenProcess called with processId:', processId);
    console.log('[CallActivityNavigator] Active tab:', this._activeTab?.file?.path);

    // Prüfe zuerst, ob der Prozess in der aktuell geöffneten Datei eingebettet ist
    if (this._activeTab?.file?.path) {
      const embeddedProcessIds = await this._getEmbeddedProcessIds(this._activeTab.file.path);
      console.log('[CallActivityNavigator] Checking if processId', processId, 'is in', embeddedProcessIds);

      if (embeddedProcessIds.includes(processId)) {
        console.log('[CallActivityNavigator] Process is embedded in current file:', processId);
        this._displayNotification({
          type: 'info',
          title: 'Eingebetteter Prozess',
          content: `Der Prozess "${processId}" befindet sich bereits in dieser Datei.`
        });
        return;
      } else {
        console.log('[CallActivityNavigator] Process NOT embedded, searching in other files');
      }
    } else {
      console.log('[CallActivityNavigator] No active tab or file path available');
    }

    // Falls Indexing noch nicht gelaufen ist, jetzt starten
    if (this._indexingDeferred && this._pendingFiles.length > 0) {
      this._indexingDeferred = false;

      this._displayNotification({
        type: 'info',
        title: 'Indexing processes',
        content: `Scanning ${this._pendingFiles.length} BPMN files...`
      });

      await this._scanPendingFiles();
    }

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

  async _getEmbeddedProcessIds(filePath) {
    try {
      const fileSystem = this._getGlobal('fileSystem');
      const file = await fileSystem.readFile(filePath);
      const content = file.contents;

      // Finde alle Process-IDs in der Datei (nicht nur die erste)
      const processIds = [];
      const regex = /<bpmn2?:process[^>]+id="([^"]+)"/g;
      let match;

      while ((match = regex.exec(content)) !== null) {
        processIds.push(match[1]);
      }

      console.log('[CallActivityNavigator] Embedded processes in', filePath, ':', processIds);
      return processIds;
    } catch (error) {
      console.error('[CallActivityNavigator] Error reading current file:', error);
      return [];
    }
  }

  render() {
    return null;
  }
}

registerClientExtension(CallActivityNavigatorPlugin);
