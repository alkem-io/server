/**
 * Response returned by the Go file-service-go after a successful document creation.
 */
export interface CreateDocumentResult {
  id: string;
  externalID: string;
  mimeType: string;
  size: number;
}
