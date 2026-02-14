import { Visual } from '@domain/common/visual/visual.entity';
import { StorageBucket } from '@domain/storage/storage-bucket/storage.bucket.entity';
import { AuthorizableEntity } from '../entity/authorizable-entity';
import { IMediaGallery } from './media.gallery.interface';

export class MediaGallery extends AuthorizableEntity implements IMediaGallery {
  createdBy?: string;

  visuals?: Visual[];

  storageBucket?: StorageBucket;
}
