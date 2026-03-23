import { normalizePath } from './path-utils.mjs';

export class ProcessIndex {
  constructor() {
    this._locationsByProcess = new Map(); // processId -> Array<{ path: string }>
    this._processesByFile = new Map(); // filePath -> Set<processId>
  }

  isIndexed(filePath) {
    return this._processesByFile.has(normalizePath(filePath, '/'));
  }

  _rawLocations(processId) {
    let key;
    try {
      key = (processId != null && typeof processId !== 'string') ? String(processId) :
        (typeof processId === 'string' ? processId.trim() : processId);
    } catch {
      return [];
    }
    return this._locationsByProcess.get(key) || [];
  }

  getLocations(processId) {
    return this._rawLocations(processId).map(loc => ({ ...loc }));
  }

  setFileIndex(filePath, processIds) {
    filePath = normalizePath(filePath, '/');
    if (!filePath || !filePath.trim() || filePath === '.' || filePath === '..') return;
    this.removeFile(filePath);

    const uniqueProcessIds = new Set(
      (Array.isArray(processIds) ? processIds : [])
        .filter(Boolean)
        .map(id => typeof id === 'string' ? id.trim() : String(id))
        .filter(Boolean)
    );

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
