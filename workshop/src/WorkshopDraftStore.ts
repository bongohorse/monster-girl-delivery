import type { Catalog } from './catalog';
import {
  emptyLocalData,
  type LocalData,
  type LocalResult,
  parseLocalData,
  serializeLocalData,
} from './localData';

export const storageKey = 'mgd:workshop:v1:local';
type LocalStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Owns one isolated bundle. Invalid imports never change memory or persistent data. */
export class WorkshopDraftStore {
  private data = emptyLocalData();
  private preserveInvalidStorage = false;
  message = '';

  constructor(
    private readonly catalog: Catalog,
    private readonly storage: () => LocalStorage,
  ) {
    try {
      const json = this.storage().getItem(storageKey);
      if (!json) return;
      const result = parseLocalData(json, this.catalog);
      if (result.ok) this.data = result.data;
      else {
        this.preserveInvalidStorage = true;
        this.message = `Vorhandene lokale Daten sind ungültig und bleiben im Browserspeicher unverändert. Neue Arbeit bleibt vorerst nur im Arbeitsspeicher; JSON-Export ist möglich. ${result.errors.join(' ')}`;
      }
    } catch {
      this.message =
        'Lokaler Speicher nicht verfügbar. Arbeit und JSON-Export bleiben im Arbeitsspeicher möglich.';
    }
  }
  snapshot(): LocalData {
    return structuredClone(this.data);
  }
  exportJSON(): string {
    return serializeLocalData(this.data);
  }
  update(data: LocalData): LocalResult {
    const result = parseLocalData(serializeLocalData(data), this.catalog);
    if (!result.ok) return result;
    this.data = result.data;
    this.save();
    return result;
  }
  importJSON(json: string): LocalResult {
    const result = parseLocalData(json, this.catalog);
    if (!result.ok) return result;
    // Only an explicit, valid complete import may replace a previously corrupt stored bundle.
    this.preserveInvalidStorage = false;
    this.data = result.data;
    this.save();
    return result;
  }
  private save(): void {
    if (this.preserveInvalidStorage) return;
    try {
      this.storage().setItem(storageKey, this.exportJSON());
      this.message = 'Lokal in diesem Browser gespeichert · unveröffentlicht.';
    } catch {
      this.message =
        'Nicht dauerhaft gespeichert: lokaler Speicher nicht verfügbar oder voll. Arbeit bleibt im Arbeitsspeicher; bitte JSON exportieren.';
    }
  }
}
