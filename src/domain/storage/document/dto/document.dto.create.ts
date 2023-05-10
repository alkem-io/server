import { MimeFileType } from '@common/enums/mime.file.type';

export class CreateDocumentInput {
  displayName!: string;

  createdBy!: string;

  mimeType!: MimeFileType;

  size!: number;

  externalID!: string;

  anonymousReadAccess!: boolean;
}
