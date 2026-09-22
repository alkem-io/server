import {
  CONVERSATION_MEDIA_ALLOWED_MIME_TYPES,
  DEFAULT_ALLOWED_MIME_TYPES,
} from './mime.file.type';
import { MimeTypeDocument } from './mime.file.type.document';
import { MimeTypeMedia } from './mime.file.type.media';
import { MimeTypeVisual } from './mime.file.type.visual';

describe('CONVERSATION_MEDIA_ALLOWED_MIME_TYPES', () => {
  it('excludes image/svg+xml (defense-in-depth, feature 013)', () => {
    expect(CONVERSATION_MEDIA_ALLOWED_MIME_TYPES).not.toContain(
      'image/svg+xml'
    );
  });

  // FIX 4: the two 013 migrations (MatrixMediaStorageBucket,
  // ConversationStorageAggregator) inline an identical MIME list — see the sync
  // comments there — so new-conversation, backfilled, and staging buckets share
  // ONE policy. This locks the runtime source set; if it changes, those inline
  // lists must be updated to match.
  it('is exactly visual (excl. SVG) + audio/video + the full document set', () => {
    const expected = new Set<string>([
      ...Object.values(MimeTypeVisual).filter(m => m !== MimeTypeVisual.SVG),
      ...Object.values(MimeTypeMedia),
      ...Object.values(MimeTypeDocument),
    ]);
    expect(new Set(CONVERSATION_MEDIA_ALLOWED_MIME_TYPES)).toEqual(expected);
  });

  it('includes office documents that must not be rejected in backfilled/staging buckets', () => {
    // The exact regression FIX 4 guards: office docs allowed at runtime were
    // rejected by the migrations, which inlined only application/pdf.
    for (const mimeType of [
      MimeTypeDocument.DOCX,
      MimeTypeDocument.XLSX,
      MimeTypeDocument.CSV,
      MimeTypeDocument.PPTX,
    ]) {
      expect(CONVERSATION_MEDIA_ALLOWED_MIME_TYPES).toContain(mimeType);
    }
  });

  it('still permits the common safe image / audio / video / document types', () => {
    expect(CONVERSATION_MEDIA_ALLOWED_MIME_TYPES).toEqual(
      expect.arrayContaining([
        'image/png',
        'image/jpeg',
        'image/webp',
        'video/mp4',
        'audio/mpeg',
        'application/pdf',
      ])
    );
  });

  it('does not opt audio/video into the platform default bucket set', () => {
    // SVG remains valid for ordinary platform buckets — only the conversation
    // media policy drops it.
    expect(DEFAULT_ALLOWED_MIME_TYPES).toContain('image/svg+xml');
    expect(DEFAULT_ALLOWED_MIME_TYPES).not.toContain('video/mp4');
  });
});
