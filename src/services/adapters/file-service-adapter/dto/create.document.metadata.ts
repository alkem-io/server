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
}
