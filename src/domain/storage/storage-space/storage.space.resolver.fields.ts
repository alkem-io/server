import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
} from '@src/common/decorators';
import { IStorageSpace } from './storage.space.interface';
import { IDocument } from '../document/document.interface';
import { AgentInfo } from '@core/authentication/agent-info';
import { StorageSpaceService } from './storage.space.service';
import { UUID_NAMEID } from '@domain/common/scalars';
import { StorageSpaceArgsDocuments } from './dto/storage.space..args.documents';

@Resolver(() => IStorageSpace)
export class StorageSpaceResolverFields {
  constructor(private storageService: StorageSpaceService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('document', () => IDocument, {
    nullable: true,
    description: 'A single Document',
  })
  @UseGuards(GraphqlGuard)
  async document(
    @Parent() storage: IStorageSpace,
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'ID',
      nullable: false,
      type: () => UUID_NAMEID,
      description: 'The ID or NAMEID of the Document',
    })
    ID: string
  ): Promise<IDocument> {
    const results = await this.storageService.getDocumentsArgs(
      storage,
      { IDs: [ID] },
      agentInfo
    );
    return results[0];
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('documents', () => [IDocument], {
    nullable: true,
    description: 'The list of Documents for this Storage.',
  })
  async documents(
    @Parent() storage: IStorageSpace,
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: true }) args: StorageSpaceArgsDocuments
  ) {
    return await this.storageService.getDocumentsArgs(storage, args, agentInfo);
  }
}
