import data from '../data/catalog.json';

export interface Category {
  id: string;
  name: string;
}

export interface Source {
  id: string;
  path: string;
  revision: string;
  kind: string;
  symbol?: string;
}

export interface Fact {
  label: string;
  value: string | number | boolean | null;
  unit?: string;
  certainty: string;
  maturity?: string;
  sourceIds: string[];
}

export interface Element {
  id: string;
  name: string;
  type: string;
  categoryId: string;
  tags: string[];
  description: string;
  documentation: {
    state: string;
    date: string;
    revision: string;
    notes: string;
    coverage: string;
  };
  implementation: string;
  archived: boolean;
  previewPath: string | null;
  sources: Source[];
  detailSections: { title: string; facts: Fact[] }[];
  relatedElementIds: string[];
  openQuestions: string[];
  sourceConflicts: string[];
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
