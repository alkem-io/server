/**
 * Collabora office-document fire-and-forget event patterns emitted by the WOPI
 * service and consumed by the unified collaboration-integration controller.
 *
 * These are a DISTINCT modality from the unified Yjs memo/whiteboard contract
 * (`CollaborationMessagePattern` / `CollaborationEventPattern`): office documents
 * are edited through Collabora/WOPI, not the Yjs collaboration-service. The
 * wire strings are the frozen contract with the WOPI producer and MUST NOT
 * change (the producer publishes them on the `COLLABORATION_DOCUMENT_SERVICE`
 * queue).
 */
export enum OfficeDocumentEventPattern {
  CONTRIBUTION = 'collaboration-office-document-contribution',
  VIEW = 'collaboration-office-document-view',
  // Emitted by the WOPI service when a document is renamed from inside the editor
  // (Collabora RenameFile). The server is the rename authority: it updates both the
  // CollaboraDocument profile and the backing file-service document, keeping the
  // callout title and the editor's filename in sync.
  RENAME = 'collaboration-office-document-rename',
}
