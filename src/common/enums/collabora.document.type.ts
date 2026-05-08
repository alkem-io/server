import { registerEnumType } from '@nestjs/graphql';

export enum CollaboraDocumentType {
  SPREADSHEET = 'spreadsheet',
  PRESENTATION = 'presentation',
  WORDPROCESSING = 'wordprocessing',
  DRAWING = 'drawing',
}

registerEnumType(CollaboraDocumentType, {
  name: 'CollaboraDocumentType',
});
