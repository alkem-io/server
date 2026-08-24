import { registerEnumType } from '@nestjs/graphql';

export enum CollaboraDocumentType {
  SPREADSHEET = 'spreadsheet',
  PRESENTATION = 'presentation',
  WORDPROCESSING = 'wordprocessing',
  DRAWING = 'drawing',
  PDF = 'pdf',
}

registerEnumType(CollaboraDocumentType, {
  name: 'CollaboraDocumentType',
});
