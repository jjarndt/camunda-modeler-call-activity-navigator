import { normalizePath } from './path-utils.mjs';

export class ProcessIndex {
  constructor() {
    this._locationsByProcess = new Map(); // processId -> Array<{ path: string }>
    this._processesByFile = new Map(); // filePath -> Set<processId>
  }

  isIndexed(filePath) {
    return this._processesByFile.has(normalizePath(filePath, '/'));
  }

  getLocations(processId) {
    return [...(this._locationsByProcess.get(processId) || [])];
  }

  setFileIndex(filePath, processIds) {
    filePath = normalizePath(filePath, '/');
    this.removeFile(filePath);

    const uniqueProcessIds = new Set(processIds || []);

    for (const processId of uniqueProcessIds) {
      const existing = this._locationsByProcess.get(processId) || [];
      existing.push({ path: filePath });
      this._locationsByProcess.set(processId, existing);
    }

    this._processesByFile.set(filePath, uniqueProcessIds);
  }

  removeFile(filePath) {
    filePath = normalizePath(filePath, '/');
    const processIds = this._processesByFile.get(filePath);
    if (!processIds) return;

    for (const processId of processIds) {
      const locations = this._locationsByProcess.get(processId);
      if (!locations) continue;

      const filtered = locations.filter(loc => loc.path !== filePath);

      if (filtered.length === 0) {
        this._locationsByProcess.delete(processId);
      } else {
        this._locationsByProcess.set(processId, filtered);
      }
    }

    this._processesByFile.delete(filePath);
  }
}
