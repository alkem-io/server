import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { GraphqlGuard } from '@core/authorization';
import { UUID } from '@domain/common/scalars';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
} from '@src/common/decorators';
import { IDocument } from '../document/document.interface';
import { StorageBucketArgsDocuments } from './dto/storage.bucket.args.documents';
import { IStorageBucketParent } from './dto/storage.bucket.dto.parent';
import { IStorageBucket } from './storage.bucket.interface';
import { StorageBucketService } from './storage.bucket.service';

@Resolver(() => IStorageBucket)
export class StorageBucketResolverFields {
  constructor(private storageBucketService: StorageBucketService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('document', () => IDocument, {
    nullable: true,
    description: 'A single Document',
  })
  async document(
    @Parent() storageBucket: IStorageBucket,
    @CurrentUser() agentInfo: AgentInfo,
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
      agentInfo
    );
    return results[0];
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('documents', () => [IDocument], {
    nullable: false,
    description: 'The list of Documents for this StorageBucket.',
  })
  async documents(
    @Parent() storageBucket: IStorageBucket,
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: true }) args: StorageBucketArgsDocuments
  ) {
    return await this.storageBucketService.getFilteredDocuments(
      storageBucket,
      args,
      agentInfo
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('size', () => Number, {
    nullable: false,
    description: 'The aggregate size of all Documents for this StorageBucket.',
  })
  async size(@Parent() storageBucket: IStorageBucket) {
    return await this.storageBucketService.size(storageBucket);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
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
