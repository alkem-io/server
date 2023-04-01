import { Resolver } from '@nestjs/graphql';
import { IStorageSpace } from './storage.space.interface';
import { StorageSpaceService } from './storage.space.service';
// import { AuthorizationPrivilege } from '@common/enums';
// import { GraphqlGuard } from '@core/authorization';
// import { UseGuards } from '@nestjs/common';
// import {
//   AuthorizationAgentPrivilege,
//   CurrentUser,
// } from '@src/common/decorators';
// import { Args, Parent, ResolveField } from '@nestjs/graphql';
// import { IDocument } from '../document/document.interface';
// import { AgentInfo } from '@core/authentication/agent-info';
// import { UUID_NAMEID } from '@domain/common/scalars';
// import { StorageSpaceArgsDocuments } from './dto/storage.space..args.documents';

@Resolver(() => IStorageSpace)
export class StorageSpaceResolverFields {
  constructor(private storageSpaceService: StorageSpaceService) {}

  // @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  // @ResolveField('document', () => IDocument, {
  //   nullable: true,
  //   description: 'A single Document',
  // })
  // @UseGuards(GraphqlGuard)
  // async document(
  //   @Parent() storageSpace: IStorageSpace,
  //   @CurrentUser() agentInfo: AgentInfo,
  //   @Args({
  //     name: 'ID',
  //     nullable: false,
  //     type: () => UUID_NAMEID,
  //     description: 'The ID or NAMEID of the Document',
  //   })
  //   ID: string
  // ): Promise<IDocument> {
  //   const results = await this.storageSpaceService.getDocumentsArgs(
  //     storageSpace,
  //     { IDs: [ID] },
  //     agentInfo
  //   );
  //   return results[0];
  // }

  // @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  // @UseGuards(GraphqlGuard)
  // @ResolveField('documents', () => [IDocument], {
  //   nullable: true,
  //   description: 'The list of Documents for this StorageSpace.',
  // })
  // async documents(
  //   @Parent() storageSpace: IStorageSpace,
  //   @CurrentUser() agentInfo: AgentInfo,
  //   @Args({ nullable: true }) args: StorageSpaceArgsDocuments
  // ) {
  //   return await this.storageSpaceService.getDocumentsArgs(
  //     storageSpace,
  //     args,
  //     agentInfo
  //   );
  // }
}
