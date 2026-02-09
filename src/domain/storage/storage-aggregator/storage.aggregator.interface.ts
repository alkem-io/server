import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { IStorageBucket } from '../storage-bucket/storage.bucket.interface';

@ObjectType('StorageAggregator')
export abstract class IStorageAggregator extends IAuthorizable {
  directStorage?: IStorageBucket;

  parentStorageAggregator?: IStorageAggregator;

  @Field(() => StorageAggregatorType, {
    nullable: true,
    description:
      'A type of entity that this StorageAggregator is being used with.',
  })
  type!: StorageAggregatorType;
}
