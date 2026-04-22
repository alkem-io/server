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
}
