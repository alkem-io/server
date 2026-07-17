export enum CollaborativeDocumentEventPattern {
  MEMO_CONTRIBUTION = 'collaboration-memo-contribution',
  OFFICE_DOCUMENT_CONTRIBUTION = 'collaboration-office-document-contribution',
  OFFICE_DOCUMENT_VIEW = 'collaboration-office-document-view',
  // Emitted by the WOPI service when a document is renamed from inside the editor
  // (Collabora RenameFile). The server is the rename authority: it updates both the
  // CollaboraDocument profile and the backing file-service document, keeping the
  // callout title and the editor's filename in sync.
  OFFICE_DOCUMENT_RENAME = 'collaboration-office-document-rename',
}
