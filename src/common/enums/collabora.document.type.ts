import { registerEnumType } from '@nestjs/graphql';

export enum CollaboraDocumentType {
  SPREADSHEET = 'spreadsheet',
  PRESENTATION = 'presentation',
  TEXT_DOCUMENT = 'text_document',
}

registerEnumType(CollaboraDocumentType, {
  name: 'CollaboraDocumentType',
});
