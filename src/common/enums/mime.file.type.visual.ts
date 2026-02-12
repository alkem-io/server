import { registerEnumType } from '@nestjs/graphql';

export enum MimeTypeVisual {
  BMP = 'image/bmp',
  JPG = 'image/jpg',
  JPEG = 'image/jpeg',
  XPNG = 'image/x-png',
  PNG = 'image/png',
  GIF = 'image/gif',
  WEBP = 'image/webp',
  SVG = 'image/svg+xml',
  AVIF = 'image/avif',
  HEIC = 'image/heic',
  HEIF = 'image/heif',
}

registerEnumType(MimeTypeVisual, {
  name: 'MimeTypeVisual',
});
