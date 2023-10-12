import { MimeFileType } from '@common/enums/mime.file.type';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';

export class CreateStorageBucketInput {
  allowedMimeTypes?: MimeFileType[];
  maxFileSize?: number;
  storageAggregator!: IStorageAggregator;
}
