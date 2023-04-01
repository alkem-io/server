import { registerEnumType } from '@nestjs/graphql';
import { MimeFileTypeDocument } from './mime.file.type.document';
import { MimeFileTypeVisual } from './mime.file.type.visual';

export const MimeFileType = {
  ...MimeFileTypeDocument,
  ...MimeFileTypeVisual,
};

export type MimeFileType = MimeFileTypeVisual | MimeFileTypeDocument;

registerEnumType(MimeFileType, {
  name: 'MimeType',
});
