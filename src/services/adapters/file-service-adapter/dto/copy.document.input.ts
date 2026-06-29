/**
 * Request body for `POST /internal/file/copy` on file-service-go (v0.0.14+).
 *
 * Materializes a new file row in `destinationBucketId` that references the
 * same content as `sourceId`. file-service-go is content-addressed, so the
 * underlying blob is shared — only ownership/placement changes. Avoids the
 * legacy `getDocumentContent` + `createDocument` round-trip that used to
 * pull and push file bytes through the server pod for no reason.
 */
export interface CopyDocumentInput {
  sourceId: string;
  destinationBucketId: string;
  authorizationId: string;
  tagsetId?: string;
  createdBy?: string;
  /**
   * Mirrors `CreateDocumentMetadata.skipDedup`. When true, bypass the
   * destination bucket's per-content dedup lookup and force a fresh row.
   */
  skipDedup?: boolean;
  /**
   * Opaque caller reference (feature 013) set on the copied row — used by the
   * inbound re-share fork to preserve `externalReference = media_id` so the
   * re-shared conversation document still resolves by-reference.
   */
  externalReference?: string;
}
