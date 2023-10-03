import { MimeFileType } from '@common/enums/mime.file.type';

export class CreateStorageBucketInput {
  allowedMimeTypes?: MimeFileType[];
  maxFileSize?: number;
}
