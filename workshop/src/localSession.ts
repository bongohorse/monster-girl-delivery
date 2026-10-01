import { catalog } from './catalog';
import { WorkshopDraftStore } from './WorkshopDraftStore';

export const localDrafts = new WorkshopDraftStore(catalog, () => window.localStorage);
