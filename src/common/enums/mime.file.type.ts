import { registerEnumType } from '@nestjs/graphql';
import { MimeTypeDocument } from './mime.file.type.document';
import { MimeTypeVisual } from './mime.file.type.visual';

export const MimeFileType = {
  ...MimeTypeDocument,
  ...MimeTypeVisual,
};

export type MimeFileType = MimeTypeVisual | MimeTypeDocument;

registerEnumType(MimeFileType, {
  name: 'MimeType',
});
