/// <reference types="vite/client" />

declare module 'virtual:workshop-media' {
  const media: Record<string, import('./catalog').PublishedArtifact>;
  export default media;
}

declare const __WORKSHOP_CATALOG_INDEX__: import('./search').CatalogIndex;
