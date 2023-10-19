import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';
import { IStorageBucket } from '../storage-bucket/storage.bucket.interface';

@ObjectType('StorageAggregator')
export abstract class IStorageAggregator extends IAuthorizable {
  directStorage?: IStorageBucket;

  parentStorageAggregator?: IStorageAggregator;
}
