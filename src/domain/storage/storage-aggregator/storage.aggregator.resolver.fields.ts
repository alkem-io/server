import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationActorHasPrivilege } from '@src/common/decorators';
import { IStorageBucket } from '../storage-bucket/storage.bucket.interface';
import { IStorageAggregatorParent } from './dto/storage.aggregator.dto.parent';
import { IStorageAggregator } from './storage.aggregator.interface';
import { StorageAggregatorService } from './storage.aggregator.service';

@Resolver(() => IStorageAggregator)
export class StorageAggregatorResolverFields {
  constructor(private storageAggregatorService: StorageAggregatorService) {}

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('size', () => Number, {
    nullable: false,
    description:
      'The aggregate size of all StorageBuckets for this StorageAggregator.',
  })
  async size(@Parent() storageAggregator: IStorageAggregator) {
    return await this.storageAggregatorService.size(storageAggregator);
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('storageAggregators', () => [IStorageAggregator], {
    nullable: false,
    description:
      'The list of child storageAggregators for this StorageAggregator.',
  })
  async childStorageAggregators(
    @Parent() storageAggregator: IStorageAggregator
  ): Promise<IStorageAggregator[]> {
    return await this.storageAggregatorService.getChildStorageAggregators(
      storageAggregator
    );
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('directStorageBucket', () => IStorageBucket, {
    nullable: false,
    description:
      'The Storage Bucket for files directly on this Storage Aggregator (legacy).',
  })
  async directStorageBucket(
    @Parent() storageAggregator: IStorageAggregator
  ): Promise<IStorageBucket> {
    return await this.storageAggregatorService.getDirectStorageBucket(
      storageAggregator
    );
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('storageBuckets', () => [IStorageBucket], {
    nullable: false,
    description:
      'The Storage Buckets that are being managed via this StorageAggregators.',
  })
  async storageBuckets(
    @Parent() storageAggregator: IStorageAggregator
  ): Promise<IStorageBucket[]> {
    return await this.storageAggregatorService.getStorageBuckets(
      storageAggregator
    );
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('parentEntity', () => IStorageAggregatorParent, {
    nullable: true,
    description:
      'The key information about the entity using this StorageAggregator, if any.',
  })
  async parentEntity(
    @Parent() storageAggregator: IStorageAggregator
  ): Promise<IStorageAggregatorParent | null> {
    return await this.storageAggregatorService.getParentEntity(
      storageAggregator
    );
  }
}
