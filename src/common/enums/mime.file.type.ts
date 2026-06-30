import { registerEnumType } from '@nestjs/graphql';
import { MimeTypeDocument } from './mime.file.type.document';
import { MimeTypeMedia } from './mime.file.type.media';
import { MimeTypeVisual } from './mime.file.type.visual';

export const MimeFileType = {
  ...MimeTypeDocument,
  ...MimeTypeVisual,
  ...MimeTypeMedia,
};

export type MimeFileType = MimeTypeVisual | MimeTypeDocument | MimeTypeMedia;

// Platform default for ordinary buckets — visual + document only. Audio/video
// (MimeTypeMedia) are intentionally NOT in the default; only the conversation
// media bucket policy opts them in (see CONVERSATION_MEDIA_ALLOWED_MIME_TYPES).
export const DEFAULT_ALLOWED_MIME_TYPES = [
  ...Object.values(MimeTypeDocument),
  ...Object.values(MimeTypeVisual),
];

/**
 * Curated safe set for conversation media attachments (feature 013): images,
 * audio, video, and common documents. Executables / scripts / unknown types are
 * rejected by omission. Enforced server-side via the conversation bucket policy
 * (and forwarded to file-service on upload), not only on the client (FR-022).
 *
 * `image/svg+xml` is intentionally excluded (defense-in-depth): SVG can carry
 * active content, so it is not offered for member-to-member upload here even
 * though it remains a valid platform visual type elsewhere. Pre-existing SVG
 * content is still served safely (as an attachment) by file-service.
 */
export const CONVERSATION_MEDIA_ALLOWED_MIME_TYPES = [
  ...Object.values(MimeTypeVisual).filter(
    mimeType => mimeType !== MimeTypeVisual.SVG
  ),
  ...Object.values(MimeTypeMedia),
  ...Object.values(MimeTypeDocument),
];

registerEnumType(MimeFileType, {
  name: 'MimeType',
});
