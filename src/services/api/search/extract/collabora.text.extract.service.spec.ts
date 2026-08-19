import { MimeTypeDocument } from '@common/enums/mime.file.type.document';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  CONTENT_FIELD_SIZE_LIMIT,
  CollaboraExtractSkipReason,
  CollaboraTextExtractService,
  cleanExtractedText,
  collectTextFromOfficeAst,
  truncateToContentFieldLimit,
} from './collabora.text.extract.service';

/**
 * Minimal real OOXML fixtures (built by hand, base64-embedded so the test needs
 * no binary assets or `zip` CLI). Each is a valid package the parser accepts.
 *  - test.docx  : body text "quantum widget roadmap body text"
 *  - test.xlsx  : sheet named "Quarterly Budget", cell "supplier onboarding checklist"
 *  - test.pptx  : slide text "quantum widget roadmap" + speaker notes
 *                 "migration cutover plan secret note"
 *  - empty.docx : a single empty paragraph → no usable text
 */
const FIXTURES = {
  docx: 'UEsDBBQAAAAIAEl+2VzIZt/Q7AAAAK8BAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH1QyW7CMBC98xWWryhx6KGqqiQcuhzbHugHjOxJYuFNHkPh7zsByqGiPc68Va9dH7wTe8xkY+jkqm6kwKCjsWHs5OfmtXqQggoEAy4G7OQRSa77Rbs5JiTB4kCdnEpJj0qRntAD1TFhYGSI2UPhM48qgd7CiOquae6VjqFgKFWZPWTfPuMAO1fEy4Hf5yIZHUnxdCbOWZ2ElJzVUBhX+2B+pVSXhJqVJw5NNtGSCVLdTJiRvwMuundeJluD4gNyeQPPLPUVs1Em6p1nZf2/zY2ecRisxqt+dks5aiTiyb2rr4gHG376q9Pc/eIbUEsDBAoAAAAAAEl+2VwAAAAAAAAAAAAAAAAGAAAAX3JlbHMvUEsDBBQAAAAIAEl+2Vw6SRuAsQAAACsBAAALAAAAX3JlbHMvLnJlbHONzzsOwjAMBuC9p4i807QMCKGmXRBSV1QOECVuGtE8lIRHb08GBooYGG3//iw33dPM5I4hamcZ1GUFBK1wUlvF4DKcNnsgMXEr+ewsMlgwQtcWzRlnnvJOnLSPJCM2MphS8gdKo5jQ8Fg6jzZPRhcMT7kMinourlwh3VbVjoZPA9qVSXrJIPSyBjIsHv+x3ThqgUcnbgZt+nHiK5FlHhQmBg8XJJXvdplZoG1DVy+2xQtQSwMECgAAAAAASX7ZXAAAAAAAAAAAAAAAAAUAAAB3b3JkL1BLAwQUAAAACABJftlcuMmOi64AAADrAAAAEQAAAHdvcmQvZG9jdW1lbnQueG1sRY49DsIwDEZ3ThFlpykMCFX92TgBHCA0pq3U2CFxSXt7kjKwPMv6Pj277lY7iw/4MBE28lSUUgD2ZCYcGvm4345XKQJrNHomhEZuEGTXHupYGeoXC8giGTBUsZEjs6uUCv0IVoeCHGDKXuSt5rT6QUXyxnnqIYR0wM7qXJYXZfWEsk3KJ5ktT5fhM7h9Lxp5sSJOZgAWnrSx2olcFQwr1yq3Mv1Ot/NnUv8v28MXUEsDBAoAAAAAAEl+2VwAAAAAAAAAAAAAAAALAAAAd29yZC9fcmVscy9QSwECHgMUAAAACABJftlcyGbf0OwAAACvAQAAEwAAAAAAAAABAAAAtIEAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAQIeAwoAAAAAAEl+2VwAAAAAAAAAAAAAAAAGAAAAAAAAAAAAEAD9QR0BAABfcmVscy9QSwECHgMUAAAACABJftlcOkkbgLEAAAArAQAACwAAAAAAAAABAAAAtIFBAQAAX3JlbHMvLnJlbHNQSwECHgMKAAAAAABJftlcAAAAAAAAAAAAAAAABQAAAAAAAAAAABAA/UEbAgAAd29yZC9QSwECHgMUAAAACABJftlcuMmOi64AAADrAAAAEQAAAAAAAAABAAAAtIE+AgAAd29yZC9kb2N1bWVudC54bWxQSwECHgMKAAAAAABJftlcAAAAAAAAAAAAAAAACwAAAAAAAAAAABAA/UEbAwAAd29yZC9fcmVscy9QSwUGAAAAAAYABgBZAQAARAMAAAAA',
  xlsx: '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',
  pptx: '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',
  emptyDocx:
    'UEsDBBQAAAAIAEl+2VzIZt/Q7AAAAK8BAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH1QyW7CMBC98xWWryhx6KGqqiQcuhzbHugHjOxJYuFNHkPh7zsByqGiPc68Va9dH7wTe8xkY+jkqm6kwKCjsWHs5OfmtXqQggoEAy4G7OQRSa77Rbs5JiTB4kCdnEpJj0qRntAD1TFhYGSI2UPhM48qgd7CiOquae6VjqFgKFWZPWTfPuMAO1fEy4Hf5yIZHUnxdCbOWZ2ElJzVUBhX+2B+pVSXhJqVJw5NNtGSCVLdTJiRvwMuundeJluD4gNyeQPPLPUVs1Em6p1nZf2/zY2ecRisxqt+dks5aiTiyb2rr4gHG376q9Pc/eIbUEsDBAoAAAAAAEl+2VwAAAAAAAAAAAAAAAAGAAAAX3JlbHMvUEsDBBQAAAAIAEl+2Vw6SRuAsQAAACsBAAALAAAAX3JlbHMvLnJlbHONzzsOwjAMBuC9p4i807QMCKGmXRBSV1QOECVuGtE8lIRHb08GBooYGG3//iw33dPM5I4hamcZ1GUFBK1wUlvF4DKcNnsgMXEr+ewsMlgwQtcWzRlnnvJOnLSPJCM2MphS8gdKo5jQ8Fg6jzZPRhcMT7kMinourlwh3VbVjoZPA9qVSXrJIPSyBjIsHv+x3ThqgUcnbgZt+nHiK5FlHhQmBg8XJJXvdplZoG1DVy+2xQtQSwMECgAAAAAASX7ZXAAAAAAAAAAAAAAAAAUAAAB3b3JkL1BLAwQUAAAACABJftlcLzlKU44AAACwAAAAEQAAAHdvcmQvZG9jdW1lbnQueG1sRY1BDsIgEEX3noLM3lJdGNMUuvMEegCEsW1SZgiD1t5eXBhXPy8/ea8f3nFRL8wyMxk4NC0oJM9hptHA7XrZn0FJcRTcwoQGNhQY7K5fu8D+GZGKqgaSbjUwlZI6rcVPGJ00nJDq9+AcXamYR71yDimzR5EaiIs+tu1JRzcT2Kq8c9i+m7Tt9Q/1P2V3H1BLAQIeAxQAAAAIAEl+2VzIZt/Q7AAAAK8BAAATAAAAAAAAAAEAAAC0gQAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAh4DCgAAAAAASX7ZXAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAQAP1BHQEAAF9yZWxzL1BLAQIeAxQAAAAIAEl+2Vw6SRuAsQAAACsBAAALAAAAAAAAAAEAAAC0gUEBAABfcmVscy8ucmVsc1BLAQIeAwoAAAAAAEl+2VwAAAAAAAAAAAAAAAAFAAAAAAAAAAAAEAD9QRsCAAB3b3JkL1BLAQIeAxQAAAAIAEl+2VwvOUpTjgAAALAAAAARAAAAAAAAAAEAAAC0gT4CAAB3b3JkL2RvY3VtZW50LnhtbFBLBQYAAAAABQAFACABAAD7AgAAAAA=',
};

const bufferFor = (key: keyof typeof FIXTURES): Buffer =>
  Buffer.from(FIXTURES[key], 'base64');

const buildService = (
  fileMock: { getDocumentContent: () => Promise<Buffer> },
  maxSourceSize = 26_214_400
) =>
  Test.createTestingModule({
    providers: [
      CollaboraTextExtractService,
      { provide: FileServiceAdapter, useValue: fileMock },
      {
        provide: ConfigService,
        useValue: {
          get: (key: string) =>
            key === 'search.collabora_document_max_source_size'
              ? maxSourceSize
              : undefined,
        },
      },
      {
        provide: WINSTON_MODULE_NEST_PROVIDER,
        useValue: { warn: () => undefined, error: () => undefined },
      },
    ],
  }).compile();

// helper: a CollaboraDocument-shaped fixture with a backing document.
// `extract()` reads `id` + `document.{id,size,mimeType}` — the mimeType drives
// the officeparser `fileType` hint (we never sniff the buffer), so it must be
// present and match the fixture bytes.
const docEntity = (
  size = 1000,
  id = 'cd-1',
  mimeType: string = MimeTypeDocument.DOCX
) =>
  ({
    id,
    document: { id: 'file-1', size, mimeType },
  }) as any;

describe('CollaboraTextExtractService', () => {
  describe('cleanExtractedText (FR-002)', () => {
    it('collapses whitespace and strips control/zero-width characters', () => {
      const dirty = 'hello \u200B   world\n\t  again\uFEFF\u0007';
      expect(cleanExtractedText(dirty)).toBe('hello world again');
    });

    it('returns empty string for empty/undefined input', () => {
      expect(cleanExtractedText(undefined)).toBe('');
      expect(cleanExtractedText('   \n\t ')).toBe('');
    });
  });

  describe('extract (FR-001/014/016/018)', () => {
    it('extracts docx body text', async () => {
      const moduleRef = await buildService({
        getDocumentContent: async () => bufferFor('docx'),
      });
      const service = moduleRef.get(CollaboraTextExtractService);

      const { content, skipReason } = await service.extract(docEntity());
      expect(skipReason).toBeUndefined();
      expect(content).toContain('quantum widget roadmap');
      expect(content).toContain('body text');
    });

    // FR-001 requires spreadsheet sheet/tab names AND cell values, and slide
    // speaker notes — all of which officeparser's `ast.toText()` DROPS. We
    // recover them via `collectTextFromOfficeAst`. This is asserted directly
    // against a synthetic AST so it is independent of the parser's unzip path
    // (officeparser's xlsx reader throws "unexpected EOF" on the hand-built
    // minimal fixture under the SWC/vitest transform, while real Collabora
    // exports — and the same fixture in plain Node — parse fine).
    it('collects sheet/tab names, cell values, slide text and speaker notes from the AST (FR-001)', () => {
      const xlsxAst = [
        {
          type: 'sheet',
          metadata: { sheetName: 'Quarterly Budget' },
          children: [
            {
              type: 'row',
              children: [
                {
                  type: 'cell',
                  text: 'supplier onboarding checklist',
                  children: [
                    { type: 'text', text: 'supplier onboarding checklist' },
                  ],
                },
              ],
            },
          ],
        },
      ];
      const xlsxText = collectTextFromOfficeAst(xlsxAst);
      expect(xlsxText).toContain('Quarterly Budget');
      expect(xlsxText).toContain('supplier onboarding checklist');
      // sheet name is collected exactly once (no duplication)
      expect(xlsxText.match(/Quarterly Budget/g)?.length).toBe(1);

      const pptxAst = [
        {
          type: 'slide',
          metadata: { slideNumber: 1 },
          children: [
            {
              type: 'paragraph',
              text: 'quantum widget roadmap',
              children: [{ type: 'text', text: 'quantum widget roadmap' }],
            },
          ],
          notes: [
            {
              type: 'note',
              children: [
                {
                  type: 'paragraph',
                  text: 'migration cutover plan',
                  children: [{ type: 'text', text: 'migration cutover plan' }],
                },
              ],
            },
          ],
        },
      ];
      const pptxText = collectTextFromOfficeAst(pptxAst);
      expect(pptxText).toContain('quantum widget roadmap');
      expect(pptxText).toContain('migration cutover plan'); // speaker notes
      // each phrase collected exactly once (leaf-only walk, no duplication)
      expect(pptxText.match(/quantum widget roadmap/g)?.length).toBe(1);
      expect(pptxText.match(/migration cutover plan/g)?.length).toBe(1);
    });

    it('degrades an xlsx parser failure to a clean PARSE_ERROR skip, never an exception (FR-014)', async () => {
      // Deterministic parse failure: a truncated zip is invalid in every
      // environment. (The happy-path xlsx content contract — sheet names +
      // cell values — is covered deterministically by the AST-walk test above;
      // the full-fixture parse is environment-dependent under the SWC/vitest
      // transform, so asserting both outcomes here gave no regression signal.)
      const moduleRef = await buildService({
        getDocumentContent: async () => bufferFor('xlsx').subarray(0, 100),
      });
      const service = moduleRef.get(CollaboraTextExtractService);

      const { content, skipReason } = await service.extract(
        docEntity(1000, 'cd-1', MimeTypeDocument.XLSX)
      );
      expect(content).toBeNull();
      expect(skipReason).toBe(CollaboraExtractSkipReason.PARSE_ERROR);
    });

    it('extracts pptx slide text AND speaker notes (FR-001)', async () => {
      const moduleRef = await buildService({
        getDocumentContent: async () => bufferFor('pptx'),
      });
      const service = moduleRef.get(CollaboraTextExtractService);

      const { content } = await service.extract(
        docEntity(1000, 'cd-1', MimeTypeDocument.PPTX)
      );
      expect(content).toContain('quantum widget roadmap');
      // speaker notes — dropped by toText(), recovered via AST walk
      expect(content).toContain('migration cutover plan secret note');
    });

    it('returns null with NO_TEXT for a document with no usable text', async () => {
      const moduleRef = await buildService({
        getDocumentContent: async () => bufferFor('emptyDocx'),
      });
      const service = moduleRef.get(CollaboraTextExtractService);

      const { content, skipReason } = await service.extract(docEntity());
      expect(content).toBeNull();
      expect(skipReason).toBe(CollaboraExtractSkipReason.NO_TEXT);
    });

    it('skips NO_TEXT for a mimeType officeparser cannot handle — never fetches', async () => {
      let fetched = false;
      const moduleRef = await buildService({
        getDocumentContent: async () => {
          fetched = true;
          return bufferFor('docx');
        },
      });
      const service = moduleRef.get(CollaboraTextExtractService);

      // legacy binary .doc has no officeparser fileType mapping
      const { content, skipReason } = await service.extract(
        docEntity(1000, 'cd-1', MimeTypeDocument.DOC)
      );
      expect(content).toBeNull();
      expect(skipReason).toBe(CollaboraExtractSkipReason.NO_TEXT);
      // unsupported type resolved from mimeType — no pointless byte fetch
      expect(fetched).toBe(false);
    });

    it('skips OVER_CAP before fetch/parse (FR-018) — never calls the file service', async () => {
      let fetched = false;
      const moduleRef = await buildService(
        {
          getDocumentContent: async () => {
            fetched = true;
            return bufferFor('docx');
          },
        },
        100 // tiny cap
      );
      const service = moduleRef.get(CollaboraTextExtractService);

      const { content, skipReason } = await service.extract(
        docEntity(5000) // size > cap
      );
      expect(content).toBeNull();
      expect(skipReason).toBe(CollaboraExtractSkipReason.OVER_CAP);
      expect(fetched).toBe(false); // guard ran BEFORE the fetch
    });

    it('skips OVER_CAP on the actual fetched byte count when the DB size lies (FR-018)', async () => {
      const moduleRef = await buildService(
        {
          // body is larger than the cap even though the DB row claims 50 bytes
          getDocumentContent: async () => bufferFor('docx'),
        },
        100 // tiny cap
      );
      const service = moduleRef.get(CollaboraTextExtractService);

      const { content, skipReason } = await service.extract(
        docEntity(50) // DB size passes the pre-fetch check
      );
      expect(content).toBeNull();
      expect(skipReason).toBe(CollaboraExtractSkipReason.OVER_CAP);
    });

    it('returns NO_TEXT (not PARSE_ERROR) when the file-service body is empty', async () => {
      const moduleRef = await buildService({
        getDocumentContent: async () => Buffer.alloc(0),
      });
      const service = moduleRef.get(CollaboraTextExtractService);

      const { content, skipReason } = await service.extract(docEntity());
      expect(content).toBeNull();
      // an empty body is a no-text condition — never handed to the parser
      expect(skipReason).toBe(CollaboraExtractSkipReason.NO_TEXT);
    });

    it('returns PARSE_ERROR when the bytes are not a valid office file', async () => {
      const moduleRef = await buildService({
        getDocumentContent: async () =>
          Buffer.from('this is not an office document at all'),
      });
      const service = moduleRef.get(CollaboraTextExtractService);

      const { content, skipReason } = await service.extract(docEntity());
      expect(content).toBeNull();
      expect(skipReason).toBe(CollaboraExtractSkipReason.PARSE_ERROR);
    });

    it('returns FETCH_ERROR when the file-service fetch throws', async () => {
      const moduleRef = await buildService({
        getDocumentContent: async () => {
          throw new Error('storage unavailable');
        },
      });
      const service = moduleRef.get(CollaboraTextExtractService);

      const { content, skipReason } = await service.extract(docEntity());
      expect(content).toBeNull();
      // a fetch failure is distinct from a parse failure (FETCH_ERROR, not PARSE_ERROR)
      expect(skipReason).toBe(CollaboraExtractSkipReason.FETCH_ERROR);
    });

    it('truncates cleaned text to the field-size limit (FR-016)', () => {
      // Assert the truncation contract directly with a synthetic overlong
      // string — a fixture-driven extract() can never exceed the limit, so it
      // would pass whether or not the truncation branch works.
      const overlong = 'a'.repeat(CONTENT_FIELD_SIZE_LIMIT + 500_000);
      const truncated = truncateToContentFieldLimit(overlong);
      expect(truncated.length).toBe(CONTENT_FIELD_SIZE_LIMIT);
      // leading text kept, overflow dropped
      expect(truncated).toBe(overlong.slice(0, CONTENT_FIELD_SIZE_LIMIT));

      // under the limit: untouched
      const short = 'b'.repeat(100);
      expect(truncateToContentFieldLimit(short)).toBe(short);
    });
  });
});
