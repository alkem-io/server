import { Resolver } from '@nestjs/graphql';
import { IStorageBucket } from './storage.bucket.interface';
import { StorageBucketService } from './storage.bucket.service';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import {
  AuthorizationActorPrivilege,
  CurrentUser,
} from '@src/common/decorators';
import { Args, Parent, ResolveField } from '@nestjs/graphql';
import { IDocument } from '@domain/storage/document';
import { ActorContext } from '@core/actor-context';
import { UUID } from '@domain/common/scalars';
import { StorageBucketArgsDocuments } from './dto/storage.bucket.args.documents';
import { IStorageBucketParent } from './dto/storage.bucket.dto.parent';

@Resolver(() => IStorageBucket)
export class StorageBucketResolverFields {
  constructor(private storageBucketService: StorageBucketService) {}

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('document', () => IDocument, {
    nullable: true,
    description: 'A single Document',
  })
  async document(
    @Parent() storageBucket: IStorageBucket,
    @CurrentUser() actorContext: ActorContext,
    @Args({
      name: 'ID',
      nullable: false,
      type: () => UUID,
      description: 'The ID of the Document',
    })
    ID: string
  ): Promise<IDocument> {
    const results = await this.storageBucketService.getFilteredDocuments(
      storageBucket,
      { IDs: [ID] },
      actorContext
    );
    return results[0];
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('documents', () => [IDocument], {
    nullable: false,
    description: 'The list of Documents for this StorageBucket.',
  })
  async documents(
    @Parent() storageBucket: IStorageBucket,
    @CurrentUser() actorContext: ActorContext,
    @Args({ nullable: true }) args: StorageBucketArgsDocuments
  ) {
    return await this.storageBucketService.getFilteredDocuments(
      storageBucket,
      args,
      actorContext
    );
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('size', () => Number, {
    nullable: false,
    description: 'The aggregate size of all Documents for this StorageBucket.',
  })
  async size(@Parent() storageBucket: IStorageBucket) {
    return await this.storageBucketService.size(storageBucket);
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('parentEntity', () => IStorageBucketParent, {
    nullable: true,
    description:
      'The key information about the entity using this StorageBucket, if any.',
  })
  async parentEntity(
    @Parent() storageBucket: IStorageBucket
  ): Promise<IStorageBucketParent | null> {
    return await this.storageBucketService.getStorageBucketParent(
      storageBucket
    );
  }
}
