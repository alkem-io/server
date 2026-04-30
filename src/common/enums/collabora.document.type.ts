import { registerEnumType } from '@nestjs/graphql';

export enum CollaboraDocumentType {
  SPREADSHEET = 'spreadsheet',
  PRESENTATION = 'presentation',
  WORDPROCESSING = 'wordprocessing',
}

registerEnumType(CollaboraDocumentType, {
  name: 'CollaboraDocumentType',
});
