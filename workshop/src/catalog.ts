import data from '../data/catalog.json';

export interface Category {
  id: string;
  name: string;
}

export interface Element {
  id: string;
  name: string;
  type: string;
  categoryId: string;
  tags: string[];
  description: string;
  documentation: { state: string; date: string; notes: string };
  implementation: string;
  archived: boolean;
  previewPath: string | null;
  sources: { path: string; kind: string }[];
}

export interface Catalog {
  schemaVersion: number;
  codeReviewRevision: string;
  deployedGameRevision: string | null;
  categories: Category[];
  elements: Element[];
}

// This checked-in sample is typed here. Runtime import/schema validation belongs to task 5.
export const catalog: Catalog = data;
