import { registerEnumType } from '@nestjs/graphql';

/**
 * Audio / video MIME types accepted as conversation media attachments
 * (feature 013-matrix-media-file-service). Kept separate from the visual /
 * document sets so the platform-wide `DEFAULT_ALLOWED_MIME_TYPES` (used by
 * every other bucket) is unchanged — only the conversation bucket policy opts
 * these in. Curated safe set: no executables / scripts / unknown types.
 */
export enum MimeTypeMedia {
  // Video
  MP4 = 'video/mp4',
  WEBM = 'video/webm',
  OGV = 'video/ogg',
  QUICKTIME = 'video/quicktime',

  // Audio
  MP3 = 'audio/mpeg',
  OGA = 'audio/ogg',
  WAV = 'audio/wav',
  WEBA = 'audio/webm',
  AAC = 'audio/aac',
  FLAC = 'audio/flac',
}

registerEnumType(MimeTypeMedia, {
  name: 'MimeTypeMedia',
});
