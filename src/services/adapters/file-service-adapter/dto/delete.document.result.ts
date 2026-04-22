/**
 * IDs of server-owned entities referenced by a deleted document. The server
 * uses these to clean up the associated authorization policy and tagset after
 * the Go service has removed the document row.
 */
export interface DeleteDocumentResult {
  authorizationId: string;
  tagsetId: string | null;
}
