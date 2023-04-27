import { registerEnumType } from '@nestjs/graphql';

export enum MimeTypeDocument {
  PDF = 'application/pdf',
}

registerEnumType(MimeTypeDocument, {
  name: 'MimeTypeDocument',
});
