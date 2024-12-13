import { registerEnumType } from '@nestjs/graphql';

export enum MimeTypeDocument {
  PDF = 'application/pdf',

  XLS = 'application/vnd.ms-excel',
  XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ODS = 'application/vnd.oasis.opendocument.spreadsheet',

  DOC = 'application/msword',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ODT = 'application/vnd.oasis.opendocument.text',

  PPT = 'application/vnd.ms-powerpoint',
  PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ODP = 'application/vnd.oasis.opendocument.presentation',
  PPTM = 'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
  PPSX = 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
  PPSM = 'application/vnd.ms-powerpoint.slideshow.macroEnabled.12',
  POTX = 'application/vnd.openxmlformats-officedocument.presentationml.template',
  POTM = 'application/vnd.ms-powerpoint.template.macroEnabled.12',
}

registerEnumType(MimeTypeDocument, {
  name: 'MimeTypeDocument',
});
