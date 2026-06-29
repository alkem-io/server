/**
 * Metadata accompanying a file upload to the Go file-service-go.
 */
export interface CreateDocumentMetadata {
  displayName: string;
  /**
   * Declared MIME type of the uploaded file. Sent as the multipart part's
   * `Content-Type` header so the Go service can trust it when content-based
   * detection is inconclusive (e.g. zero-byte placeholder files or ambiguous
   * magic bytes). Falls back to `application/octet-stream` when omitted.
   */
  mimeType?: string;
  storageBucketId: string;
  authorizationId: string;
  tagsetId?: string;
  createdBy?: string;
  temporaryLocation?: boolean;
  allowedMimeTypes?: string;
  maxFileSize?: number;
  /**
   * Bypass file-service-go's per-bucket content-hash dedup and force a fresh
   * row even if an identical-content row already exists in the same bucket.
   * Used by placeholder-then-edit flows (e.g. Collabora documents) where two
   * logical documents must NOT share a backing row even though their initial
   * content (often `Buffer.alloc(0)`) is identical. Default false preserves
   * dedup for genuine content uploads.
   */
  skipDedup?: boolean;
  /**
   * Opaque caller reference (feature 013). For Matrix media this is the Synapse
   * `media_id`; file-service treats it as opaque and never parses it. Distinct
   * from `externalID` (the content hash). `UNIQUE(externalReference,
   * storageBucketId) WHERE externalReference IS NOT NULL`.
   */
  externalReference?: string;
  /**
   * Store the bytes verbatim (feature 013) — skip HEIC transcode / EXIF rotate /
   * dimension measure, so the bytes round-trip exactly (Synapse read-back
   * contract). Omit it when the inbound re-home wants a web-renderable
   * conversation copy so file-service canonicalises (research D6).
   */
  skipImageProcessing?: boolean;
}
