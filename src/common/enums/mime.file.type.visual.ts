import { registerEnumType } from '@nestjs/graphql';

export enum MimeFileTypeVisual {
  BMP = 'image/bmp',
  JPG = 'image/jpg',
  JPEG = 'image/jpeg',
  XPNG = 'image/x-png',
  PNG = 'image/png',
  GIF = 'image/gif',
  WEBP = 'image/webp',
  SVG = 'image/svg+xml',
}

registerEnumType(MimeFileTypeVisual, {
  name: 'MimeTypeVisual',
});
