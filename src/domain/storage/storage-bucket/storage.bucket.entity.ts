import { MimeFileType } from '@common/enums/mime.file.type';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Document } from '../document/document.entity';
import { StorageAggregator } from '../storage-aggregator/storage.aggregator.entity';
import { IStorageBucket } from './storage.bucket.interface';

export class StorageBucket
  extends AuthorizableEntity
  implements IStorageBucket
{
  documents!: Document[];

  // Each storage bucket has exactly one storage aggregator. Relationship is controlled by the child.
  storageAggregator?: StorageAggregator;

  allowedMimeTypes!: MimeFileType[];

  maxFileSize!: number;
}
