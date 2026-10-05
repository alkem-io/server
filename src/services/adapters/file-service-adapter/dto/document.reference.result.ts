/**
 * Document metadata returned by `GET /internal/file/by-reference` on
 * file-service-go (feature 013). The lookup resolves a document by its opaque
 * `externalReference`, either globally (provider fetch) or scoped to a single
 * bucket (read resolution / re-home decision). 404 → `null` in the adapter.
 */
export interface DocumentReferenceResult {
  id: string;
  externalID: string;
  storageBucketId: string;
  mimeType: string;
  size: number;
  displayName?: string;
  createdBy?: string;
  externalReference?: string;
  temporaryLocation?: boolean;
  imageWidth?: number;
  imageHeight?: number;
}
