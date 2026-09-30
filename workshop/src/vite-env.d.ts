/// <reference types="vite/client" />

declare module 'virtual:workshop-media' {
  const media: Record<string, import('./catalog').PublishedArtifact>;
  export default media;
}
