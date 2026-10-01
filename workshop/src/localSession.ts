import { catalog } from './catalog';
import { WorkshopDraftStore } from './WorkshopDraftStore';

export const workshopDrafts = new WorkshopDraftStore(catalog, () => window.localStorage);

export { legacyStore as localDrafts } from './legacyStore';
