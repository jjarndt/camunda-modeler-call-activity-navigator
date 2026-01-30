export class ProcessIndex {
  constructor() {
    this._processIndex = new Map(); // processId -> Array<{path: string}>
    this._fileIndex = new Map(); // filePath -> Set<processId>
  }

  isIndexed(filePath) {
    return this._fileIndex.has(filePath);
  }

  getLocations(processId) {
    return this._processIndex.get(processId) || [];
  }

  setFileIndex(filePath, processIds) {
    this.removeFile(filePath);

    const pidSet = new Set(processIds || []);
    for (const pid of pidSet) {
      const existing = this._processIndex.get(pid) || [];
      existing.push({ path: filePath });
      this._processIndex.set(pid, existing);
    }

    this._fileIndex.set(filePath, pidSet);
  }

  removeFile(filePath) {
    const pids = this._fileIndex.get(filePath);
    if (!pids) return;

    for (const pid of pids) {
      const locations = this._processIndex.get(pid);
      if (!locations) continue;
      const filtered = locations.filter(loc => loc.path !== filePath);
      if (filtered.length === 0) {
        this._processIndex.delete(pid);
      } else {
        this._processIndex.set(pid, filtered);
      }
    }

    this._fileIndex.delete(filePath);
  }
}
