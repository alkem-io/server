/**
 * Collabora office-document rename request emitted by the WOPI service
 * (`collaboration-office-document-rename`) when a document is renamed from inside
 * the editor. `documentId` is the storage `Document` id (= `access_tokens.file_id`
 * = `collaboraDocument.document.id`), NOT the `CollaboraDocument` id — the server
 * reverse-resolves the domain entity by it. `displayName` is the new name WITHOUT
 * extension (Collabora keeps the extension).
 */
export interface OfficeDocumentRenameInputData {
  documentId: string;
  displayName: string;
}
