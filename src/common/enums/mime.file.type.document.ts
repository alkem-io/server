import { registerEnumType } from '@nestjs/graphql';

export enum MimeFileTypeDocument {
  PDF = 'application/pdf',
}

registerEnumType(MimeFileTypeDocument, {
  name: 'MimeTypeDocument',
});
