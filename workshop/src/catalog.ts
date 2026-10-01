import data from '../data/catalog.json' with { type: 'json' };
import { assertCatalog } from './catalogValidation.ts';
import type { LocalConfiguration } from './localData.ts';
import type { ReviewDetails } from './prototypeConfiguration.ts';

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
  previewArtifactId: string | null;
  assetIds: string[];
  sources: Source[];
  detailSections: { title: string; facts: Fact[] }[];
  relatedElementIds: string[];
  openQuestions: string[];
  sourceConflicts: string[];
}

export interface Asset {
  id: string;
  name: string;
  description: string;
  elementIds: string[];
  artifactIds: string[];
  variant: string;
  review: { state: string; date: string; reason: string; sourceUrl: string };
  usage: { state: string; revision: string; reason: string; evidence: Source[] };
  archived: boolean;
  history: { id: string; revision: string; path: string; date: string; note: string }[];
  openQuestions: string[];
}

export interface Artifact {
  id: string;
  assetId: string;
  sourcePath: string | null;
  revision: string | null;
  sha256: string | null;
  role: string;
  runtimeAssetId: string | null;
  recipe: Source | null;
  derivedFromArtifactId: string | null;
  metadata: {
    format: string;
    width: number;
    height: number;
    hasAlpha: boolean;
    durationSeconds: number | null;
  };
  provenance: { text: string; prompt: string | null; referenceUrls: string[] };
}

export interface PublishedArtifact extends Artifact {
  url: string;
  path: string;
  sha256: string;
  generation: string | null;
}

export interface Reference {
  id: string;
  name: string;
  purpose: string;
  categoryId: string;
  tags: string[];
  elementIds: string[];
  assetIds: string[];
  sources: Source[];
}

export interface Idea {
  id: string;
  name: string;
  question: string;
  categoryId: string;
  tags: string[];
  elementIds: string[];
  referenceIds: string[];
  reviewState: string;
  archived: boolean;
  prototypeId: string | null;
}

export interface PrototypeVersion {
  id: string;
  ideaId: string;
  name: string;
  date: string;
  changeNote: string;
  entry: string;
  sourceRevision: string | null;
  sourcePaths: string[];
  capabilities: string[];
  limitations: string[];
}

export interface PublishedReview extends LocalConfiguration {
  id: string;
  date: string;
  text: string;
  review: ReviewDetails;
  sourceUrl: string;
}

export interface Catalog {
  schemaVersion: number;
  codeReviewRevision: string;
  deployedGameRevision: string | null;
  categories: Category[];
  elements: Element[];
  assets: Asset[];
  artifacts: Artifact[];
  references: Reference[];
  ideas: Idea[];
  versions: PrototypeVersion[];
  reviews: PublishedReview[];
}

// Reject malformed authored data before either Vite or the browser consumes it.
assertCatalog(data);
export const catalog: Catalog = data;
