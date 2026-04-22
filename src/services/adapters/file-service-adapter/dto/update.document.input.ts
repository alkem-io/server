/**
 * Fields the Go file-service-go accepts on PATCH /internal/file/:id.
 * Display name, MIME type, and other metadata are immutable.
 */
export interface UpdateDocumentInput {
  storageBucketId?: string;
  temporaryLocation?: boolean;
}
