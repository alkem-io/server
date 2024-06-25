import { registerEnumType } from '@nestjs/graphql';

export enum MimeTypeDocument {
  PDF = 'application/pdf',

  XLS = 'application/vnd.ms-excel',
  XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ODS = 'application/vnd.oasis.opendocument.spreadsheet',

  DOC = 'application/msword',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ODT = 'application/vnd.oasis.opendocument.text',
}

registerEnumType(MimeTypeDocument, {
  name: 'MimeTypeDocument',
});
