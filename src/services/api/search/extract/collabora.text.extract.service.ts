import { LogContext } from '@common/enums';
import { MimeTypeDocument } from '@common/enums/mime.file.type.document';
import { ICollaboraDocument } from '@domain/collaboration/collabora-document/collabora.document.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { apmAgent } from '@src/apm';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { parseOffice, type SupportedFileType } from 'officeparser';

/**
 * Maps a Document `mimeType` to the officeparser `fileType` hint. We pass this
 * explicitly so the parser NEVER falls back to buffer magic-byte auto-detection
 * — that sniffer (the `file-type` lib) fails on some Node versions and on
 * container formats, surfacing as `parse-error`. We always know the type from
 * the stored `mimeType`, so detection is unnecessary. Formats officeparser
 * cannot handle (legacy binary .doc/.xls/.ppt, macro variants, .odg) are absent
 * → the document is indexed by name only (NO_TEXT), not parsed.
 */
const OFFICE_FILE_TYPE_BY_MIME: Partial<Record<string, SupportedFileType>> = {
  [MimeTypeDocument.DOCX]: 'docx',
  [MimeTypeDocument.ODT]: 'odt',
  [MimeTypeDocument.RTF]: 'rtf',
  [MimeTypeDocument.XLSX]: 'xlsx',
  [MimeTypeDocument.ODS]: 'ods',
  [MimeTypeDocument.CSV]: 'csv',
  [MimeTypeDocument.PDF]: 'pdf',
  [MimeTypeDocument.PPTX]: 'pptx',
  [MimeTypeDocument.ODP]: 'odp',
};

const officeFileTypeForMime = (
  mime: string | undefined
): SupportedFileType | undefined =>
  mime ? OFFICE_FILE_TYPE_BY_MIME[mime] : undefined;

/**
 * Reason a Collabora office document's content was skipped during extraction.
 * Surfaced to operators via a reason-tagged Winston log + APM metric and a
 * durable TaskService record (FR-019). The searching member never sees these —
 * the owning entity stays searchable on its other fields (FR-014).
 */
export enum CollaboraExtractSkipReason {
  /** Raw file exceeds the pre-parse source-size cap (FR-018). */
  OVER_CAP = 'over-cap',
  /** Parser errored or the document yielded no usable text after cleaning. */
  NO_TEXT = 'no-text',
  /** Parser threw (corrupt / unsupported file). */
  PARSE_ERROR = 'parse-error',
  /** Error when fetching the document */
  FETCH_ERROR = 'fetch-error',
}

/**
 * Outcome of an extraction attempt. `content` is the cleaned, truncated text on
 * success; `null` with a `skipReason` otherwise. The index doc is still written
 * for a skip (empty `content`) so the document stays findable by its
 * profile.displayName/tags (FR-014, research §9).
 */
export type CollaboraExtractResult = {
  content: string | null;
  skipReason?: CollaboraExtractSkipReason;
};

/**
 * Maximum length (characters) of the cleaned `content` indexed into the
 * `office-document` ES `text` field (FR-016). Leading text is kept, overflow
 * is dropped silently — the document remains partially searchable. Sits well
 * within Elasticsearch's default `index.highlight.max_analyzed_offset`
 * (1,000,000) and analysis bounds.
 */
export const CONTENT_FIELD_SIZE_LIMIT = 1_000_000;

/**
 * FR-016: truncates cleaned text to the content-field size limit — leading
 * text kept, overflow dropped silently. Exported so the truncation contract is
 * unit-testable with a synthetic overlong string (a real >1M-char office
 * fixture would be impractical to embed).
 */
export const truncateToContentFieldLimit = (cleaned: string): string =>
  cleaned.length > CONTENT_FIELD_SIZE_LIMIT
    ? cleaned.slice(0, CONTENT_FIELD_SIZE_LIMIT)
    : cleaned;

/**
 * Extracts, cleans, size-guards and truncates the readable text of a Collabora
 * office document (text doc / spreadsheet / presentation) for the search index.
 *
 * Strategy (research §3, verified during implementation):
 *  - In-process parse via `officeparser` (no Collabora / external service —
 *    FR-017); bytes are read through `FileServiceAdapter.getDocumentContent`,
 *    never object storage directly.
 *  - `officeparser@7`'s `ast.toText()` DROPS spreadsheet sheet/tab names and
 *    presentation speaker notes, both of which FR-001 requires. We therefore
 *    walk the parsed AST ourselves, collecting leaf `text` nodes, sheet/tab
 *    names (`node.metadata.sheetName`) and structurally-attached notes
 *    (`node.notes`). OCR is left OFF (officeparser default) so image-only docs
 *    yield no text rather than invoking Tesseract.
 */
@Injectable()
export class CollaboraTextExtractService {
  private readonly maxSourceSizeBytes: number;

  constructor(
    private readonly fileServiceAdapter: FileServiceAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly configService: ConfigService<AlkemioConfig, true>
  ) {
    this.maxSourceSizeBytes = this.configService.get(
      'search.collabora_document_max_source_size',
      { infer: true }
    );
  }

  /**
   * Returns the cleaned, truncated content for a Collabora document, or `null`
   * when there is no usable text / the document was skipped. Every skip/failure
   * is reported (FR-019). Never throws — a failure is a skip.
   */
  public async extract(
    collaboraDocument: Pick<ICollaboraDocument, 'id' | 'document'>
  ): Promise<CollaboraExtractResult> {
    const document = collaboraDocument.document;

    if (!document) {
      // No backing file at all — treat as no-text (still indexed by name).
      return this.skip(
        CollaboraExtractSkipReason.NO_TEXT,
        collaboraDocument.id
      );
    }

    // FR-018: enforce the pre-parse source-file-size cap BEFORE fetching/parsing
    // to protect the in-process parser from OOM/hang on oversized files.
    if (
      typeof document.size === 'number' &&
      document.size > this.maxSourceSizeBytes
    ) {
      return this.skip(
        CollaboraExtractSkipReason.OVER_CAP,
        collaboraDocument.id,
        `size=${document.size} cap=${this.maxSourceSizeBytes}`
      );
    }

    // Resolve the officeparser type hint from the known mimeType — never let
    // the parser sniff the buffer (that auto-detection fails on some Node
    // versions, surfacing as parse-error). An unmapped type is one officeparser
    // cannot handle: skip parsing, keep the document findable by name.
    const fileType = officeFileTypeForMime(document.mimeType);
    if (!fileType) {
      return this.skip(
        CollaboraExtractSkipReason.NO_TEXT,
        collaboraDocument.id,
        `unsupported mimeType: ${document.mimeType}`
      );
    }

    let buffer: Buffer;
    try {
      // FR-017: bytes via the file-service layer, never object storage directly.
      buffer = await this.fileServiceAdapter.getDocumentContent(document.id);
    } catch (error) {
      return this.skip(
        CollaboraExtractSkipReason.FETCH_ERROR,
        collaboraDocument.id,
        `fetch failed: ${(error as Error)?.message}`
      );
    }

    // An empty body is a no-text condition, NOT a parse failure: the file-service
    // returned 0 bytes (e.g. a Collabora document whose content has not been
    // materialized to storage). Guard before parsing — officeparser throws
    // "invalid zip data" on an empty buffer. The document stays findable by name
    // (FR-014).
    if (buffer.length === 0) {
      return this.skip(
        CollaboraExtractSkipReason.NO_TEXT,
        collaboraDocument.id,
        'empty file content (0 bytes from file-service)'
      );
    }

    // Re-check the cap against the bytes actually fetched: the DB `size`
    // column is advisory (it can lag or be wrong), and the pre-fetch check
    // alone would let an oversized body straight into the in-process parser.
    if (buffer.length > this.maxSourceSizeBytes) {
      return this.skip(
        CollaboraExtractSkipReason.OVER_CAP,
        collaboraDocument.id,
        `fetched=${buffer.length} cap=${this.maxSourceSizeBytes} (DB size=${document.size})`
      );
    }

    let rawText: string;
    try {
      rawText = await this.parse(buffer, fileType);
    } catch (error) {
      return this.skip(
        CollaboraExtractSkipReason.PARSE_ERROR,
        collaboraDocument.id,
        `${(error as Error)?.message} (bytes=${buffer.length})`
      );
    }

    const cleaned = cleanExtractedText(rawText);

    if (!cleaned) {
      return this.skip(
        CollaboraExtractSkipReason.NO_TEXT,
        collaboraDocument.id
      );
    }

    return { content: truncateToContentFieldLimit(cleaned) };
  }

  /**
   * Parses the raw office-document bytes and returns ALL user-authored visible
   * text (FR-001): body text, spreadsheet cell values + sheet/tab names, slide
   * text + titles + speaker notes. Formulas, styling and metadata are excluded
   * (officeparser surfaces only rendered text values, not formulas/styles).
   */
  private async parse(
    buffer: Buffer,
    fileType: SupportedFileType
  ): Promise<string> {
    const ast = await parseOffice(buffer, {
      // Explicit type hint from the Document mimeType — bypasses officeparser's
      // buffer magic-byte auto-detection, which fails on some Node versions and
      // container formats (the cause of the parse-error skips).
      fileType,
      // Do NOT enable OCR — image-only docs should yield no text, not spin up
      // Tesseract (slow / can hang). officeparser defaults OCR off; explicit.
      ocr: false,
      // Include presentation speaker notes (FR-001). Default already false, but
      // be explicit so a library default change cannot silently drop notes.
      ignoreNotes: false,
      // Never let the parser write to stdout/stderr (noConsole; tidy logs).
      outputErrorToConsole: false,
    });

    return collectTextFromOfficeAst(ast.content);
  }

  /** Builds the skip result, emitting the FR-019 log + APM metric. */
  private skip(
    reason: CollaboraExtractSkipReason,
    collaboraDocumentId: string,
    detail?: string
  ): CollaboraExtractResult {
    this.report(reason, collaboraDocumentId, detail);
    return { content: null, skipReason: reason };
  }

  /**
   * FR-019 channel 1: a reason-tagged Winston log + APM metric per skip/failure.
   * The TaskService record (channel 2) is appended by the ingest call site,
   * which owns the active reindex Task.
   */
  private report(
    reason: CollaboraExtractSkipReason,
    collaboraDocumentId: string,
    detail?: string
  ): void {
    this.logger.warn?.(
      {
        message: 'Collabora document content extraction skipped',
        reason,
        collaboraDocumentId,
        detail,
      },
      LogContext.SEARCH_INGEST
    );

    // APM metric: label-tagged counter so operators can chart skip reasons.
    // No-ops cleanly when APM is not configured (local / tests).
    apmAgent?.currentTransaction
      ?.startSpan?.(`collabora-extract-skip:${reason}`, 'search-ingest')
      ?.end?.();
    if (reason === CollaboraExtractSkipReason.PARSE_ERROR) {
      apmAgent?.captureError?.(
        `Collabora document content extraction failed (${reason}) for ${collaboraDocumentId}${
          detail ? `: ${detail}` : ''
        }`
      );
    }
  }
}

/**
 * Collects all user-authored visible text from the top-level node list of an
 * officeparser AST (`ast.content`): body/cell/slide text, spreadsheet sheet/tab
 * names and presentation speaker notes — each exactly once (FR-001). Exported
 * so the AST-shaping contract can be unit-tested independently of the parser /
 * test-environment unzip behaviour.
 */
export const collectTextFromOfficeAst = (
  content: unknown[] | undefined
): string => {
  const parts: string[] = [];
  for (const node of content ?? []) {
    collectNodeText(node, parts);
  }
  return parts.join(' ');
};

/**
 * Recursively collects user-authored visible text from an officeparser AST node:
 * leaf `text` nodes, spreadsheet sheet/tab names and structurally-attached
 * presentation notes. Descends `children`, `content` and `notes` so notes are
 * captured exactly once.
 */
const collectNodeText = (node: unknown, parts: string[]): void => {
  if (!node || typeof node !== 'object') {
    return;
  }
  const n = node as {
    type?: string;
    text?: unknown;
    metadata?: { sheetName?: unknown };
    children?: unknown[];
    content?: unknown[];
    notes?: unknown[];
  };

  const sheetName = n.metadata?.sheetName;
  if (typeof sheetName === 'string' && sheetName.trim()) {
    parts.push(sheetName);
  }

  // Only leaf text nodes — paragraph/cell nodes also carry a concatenated
  // `text`, so collecting only leaves avoids duplicating their content.
  if (n.type === 'text' && typeof n.text === 'string') {
    parts.push(n.text);
  }

  for (const key of ['children', 'content', 'notes'] as const) {
    const kids = n[key];
    if (Array.isArray(kids)) {
      for (const child of kids) {
        collectNodeText(child, parts);
      }
    }
  }
};

/**
 * Cleans extracted text (FR-002): strips control/zero-width characters and
 * markup-ish noise, collapses whitespace. Returns `''` when nothing readable
 * remains.
 */
// Code points stripped from extracted text: C0/C1 control characters and
// zero-width / BOM / joiner characters (markup noise carrying no readable
// content). Built programmatically (not as a regex literal) so no control
// characters are embedded in source and the `noControlCharactersInRegex` lint
// rule is satisfied without a suppression.
const isStrippableCodePoint = (code: number): boolean =>
  code <= 0x1f || // C0 controls
  (code >= 0x7f && code <= 0x9f) || // DEL + C1 controls
  (code >= 0x200b && code <= 0x200d) || // zero-width space/non-joiner/joiner
  code === 0xfeff; // BOM / zero-width no-break space

export const cleanExtractedText = (raw: string | undefined): string => {
  if (!raw) {
    return '';
  }
  let stripped = '';
  for (const char of raw) {
    stripped += isStrippableCodePoint(char.codePointAt(0) ?? 0) ? ' ' : char;
  }
  // collapse all whitespace runs to single spaces and trim
  return stripped.replace(/\s+/g, ' ').trim();
};
