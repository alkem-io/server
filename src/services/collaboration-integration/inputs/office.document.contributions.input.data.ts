/**
 * Collabora office-document **contribution** / **view** window payload emitted by
 * the WOPI service (`collaboration-office-document-{contribution,view}`).
 *
 * `documentId` is the storage `Document` id (= `access_tokens.file_id` =
 * `collaboraDocument.document.id`), NOT the `CollaboraDocument` id — the server
 * reverse-resolves the domain entity from it. `writeActors` / `readonlyActors`
 * are flat actor-id arrays; the server partitions them into a typed actor set
 * for the analytics record.
 */
export interface OfficeDocumentContributionsInputData {
  documentId: string;
  writeActors: string[];
  readonlyActors: string[];
}
