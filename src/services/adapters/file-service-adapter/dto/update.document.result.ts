/**
 * Response returned by the Go file-service-go after a successful document update.
 */
export interface UpdateDocumentResult {
  id: string;
  storageBucketId: string;
  temporaryLocation: boolean;
}
