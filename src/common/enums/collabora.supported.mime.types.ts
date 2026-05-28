import { CollaboraDocumentType } from './collabora.document.type';

/**
 * MIME types Collabora Online can open and save in the editor modes we
 * surface: Writer (word processing), Calc (spreadsheet), Impress
 * (presentation), Draw (drawings). Used as the `allowedMimeTypes`
 * parameter on the `importCollaboraDocument` flow — file-service-go
 * sniffs the actual MIME from content and rejects anything not in this
 * list with `415 ErrUnsupportedMediaType`.
 *
 * Source of truth at runtime is Collabora's `/hosting/discovery`
 * endpoint, but a hand-maintained allowlist gives us deterministic
 * control over what we expose to users — discovery returns more
 * formats than we want to support (some are read-only, some are
 * niche). Update this list when Collabora adds editor modes we want
 * to surface.
 *
 * PDF is intentionally absent: Collabora's PDF mode is annotation-
 * first rather than document-first and warrants its own scope.
 */

export const MIME_TO_DOCUMENT_TYPE: Record<string, CollaboraDocumentType> = {
  // Word processing (Writer)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    CollaboraDocumentType.WORDPROCESSING,
  'application/msword': CollaboraDocumentType.WORDPROCESSING,
  'application/vnd.oasis.opendocument.text':
    CollaboraDocumentType.WORDPROCESSING,
  'application/rtf': CollaboraDocumentType.WORDPROCESSING,

  // Spreadsheet (Calc)
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    CollaboraDocumentType.SPREADSHEET,
  'application/vnd.ms-excel': CollaboraDocumentType.SPREADSHEET,
  'application/vnd.oasis.opendocument.spreadsheet':
    CollaboraDocumentType.SPREADSHEET,
  'text/csv': CollaboraDocumentType.SPREADSHEET,

  // Presentation (Impress)
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    CollaboraDocumentType.PRESENTATION,
  'application/vnd.ms-powerpoint': CollaboraDocumentType.PRESENTATION,
  'application/vnd.oasis.opendocument.presentation':
    CollaboraDocumentType.PRESENTATION,

  // Drawing (Draw)
  'application/vnd.oasis.opendocument.graphics': CollaboraDocumentType.DRAWING,
};

export const MIME_TO_EXTENSION: Record<string, string> = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'application/msword': '.doc',
  'application/vnd.oasis.opendocument.text': '.odt',
  'application/rtf': '.rtf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.oasis.opendocument.spreadsheet': '.ods',
  'text/csv': '.csv',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    '.pptx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.oasis.opendocument.presentation': '.odp',
  'application/vnd.oasis.opendocument.graphics': '.odg',
};

export const COLLABORA_SUPPORTED_MIMES: string[] = Object.keys(
  MIME_TO_DOCUMENT_TYPE
);
