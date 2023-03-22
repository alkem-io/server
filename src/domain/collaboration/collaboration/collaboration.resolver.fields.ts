import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
  Profiling,
} from '@src/common/decorators';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { AuthorizationPrivilege } from '@common/enums';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { ICallout } from '../callout/callout.interface';
import { CollaborationArgsCallouts } from './dto/collaboration.args.callouts';
import { AgentInfo } from '@core/authentication/agent-info';
import { Loader } from '@core/dataloader/decorators';
import { CollaborationRelationsLoaderCreator } from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';

@Resolver(() => ICollaboration)
export class CollaborationResolverFields {
  constructor(private collaborationService: CollaborationService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('relations', () => [IRelation], {
    nullable: true,
    description: 'The list of Relations for this Collaboration object.',
  })
  @Profiling.api
  async relations(
    @Parent() collaboration: Collaboration,
    @Loader(CollaborationRelationsLoaderCreator) loader: ILoader<IRelation[]>
  ) {
    return loader.load(collaboration.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('callouts', () => [ICallout], {
    nullable: true,
    description: 'The list of Callouts for this Collaboration object.',
  })
  @Profiling.api
  async callouts(
    @Parent() collaboration: Collaboration,
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: true }) args: CollaborationArgsCallouts
  ) {
    return await this.collaborationService.getCalloutsFromCollaboration(
      collaboration,
      args,
      agentInfo
    );
  }
}
