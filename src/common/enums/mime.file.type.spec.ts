import {
  CONVERSATION_MEDIA_ALLOWED_MIME_TYPES,
  DEFAULT_ALLOWED_MIME_TYPES,
} from './mime.file.type';

describe('CONVERSATION_MEDIA_ALLOWED_MIME_TYPES', () => {
  it('excludes image/svg+xml (defense-in-depth, feature 013)', () => {
    expect(CONVERSATION_MEDIA_ALLOWED_MIME_TYPES).not.toContain(
      'image/svg+xml'
    );
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
