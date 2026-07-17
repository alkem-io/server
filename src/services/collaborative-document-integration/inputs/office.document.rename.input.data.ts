import { BaseInputData } from './base.input.data';

/**
 * Rename request emitted by the WOPI service when a document is renamed from inside
 * the editor. `documentId` is the storage `Document` id (= `access_tokens.file_id`
 * = `collaboraDocument.document.id`), NOT the `CollaboraDocument` id — the server
 * reverse-resolves the domain entity by it. `displayName` is the new name WITHOUT
 * extension (Collabora keeps the extension).
 */
export class OfficeDocumentRenameInputData extends BaseInputData {
  constructor(
    public documentId: string,
    public displayName: string
  ) {
    super('office-document-rename');
  }
}
