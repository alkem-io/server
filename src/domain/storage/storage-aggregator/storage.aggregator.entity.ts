import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { StorageBucket } from '../storage-bucket/storage.bucket.entity';
import { IStorageAggregator } from './storage.aggregator.interface';

export class StorageAggregator
  extends AuthorizableEntity
  implements IStorageAggregator
{
  // The parent StorageAggregator can have many child StorageAggregators where it gathers storage; the relationship is controlled by the child.
  parentStorageAggregator?: StorageAggregator;

  directStorage?: StorageBucket;

  type!: StorageAggregatorType;
}
