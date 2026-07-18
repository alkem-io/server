/**
 * Document metadata returned by `GET /internal/file/{id}/meta` on
 * file-service-go (feature 013) — the same shape `documentMetaResponse` backs.
 *
 * Used by the OUTBOUND send path to source intrinsic image dimensions:
 * `imageWidth` / `imageHeight` are post-rotation pixel dimensions for
 * `image/*` content, held in file-service's cached `content_metadata` and NOT
 * persisted on the server's Document entity (they are transient there), so a DB
 * load leaves them undefined. Absent for non-image content. 404 → `null` in the
 * adapter.
 */
export interface DocumentMetaResult {
  id: string;
  externalID: string;
  mimeType: string;
  size: number;
  displayName?: string;
  createdBy?: string;
  temporaryLocation?: boolean;
  storageBucketId: string;
  imageWidth?: number;
  imageHeight?: number;
}
