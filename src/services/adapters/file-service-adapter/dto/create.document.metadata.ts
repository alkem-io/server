/**
 * Metadata accompanying a file upload to the Go file-service-go.
 */
export interface CreateDocumentMetadata {
  displayName: string;
  storageBucketId: string;
  authorizationId: string;
  tagsetId?: string;
  createdBy?: string;
  temporaryLocation?: boolean;
  allowedMimeTypes?: string;
  maxFileSize?: number;
}
