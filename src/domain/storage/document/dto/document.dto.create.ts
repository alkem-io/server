import { MimeFileType } from '@common/enums/mime.file.type';

export class CreateDocumentInput {
  displayName!: string;

  createdBy?: string;

  mimeType!: MimeFileType;

  size!: number;

  externalID!: string;

  // Whether this is a temporarily created Document that can be moved to
  // another StorageBucket
  temporaryLocation!: boolean;
}
