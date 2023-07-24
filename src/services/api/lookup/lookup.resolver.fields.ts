import { Args, Resolver } from '@nestjs/graphql';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '@src/common/decorators';
import { ResolveField } from '@nestjs/graphql';
import { AgentInfo } from '@core/authentication/agent-info';
import { LookupQueryResults } from './dto/lookup.query.results';
import { IWhiteboard } from '@domain/common/whiteboard';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CommunityService } from '@domain/community/community/community.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { ICommunity } from '@domain/community/community/community.interface';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { IContext } from '@domain/context/context/context.interface';
import { ContextService } from '@domain/context/context/context.service';

@Resolver(() => LookupQueryResults)
export class LookupResolverFields {
  constructor(
    private whiteboardService: WhiteboardService,
    private authorizationService: AuthorizationService,
    private communityService: CommunityService,
    private collaborationService: CollaborationService,
    private contextService: ContextService
  ) {}

  @UseGuards(GraphqlGuard)
  @ResolveField(() => IWhiteboard, {
    nullable: true,
    description: 'Lookup the specified Whiteboard',
  })
  async whiteboard(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IWhiteboard> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboard.authorization,
      AuthorizationPrivilege.READ,
      `lookup Whiteboard: ${whiteboard.nameID}`
    );

    return whiteboard;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => ICommunity, {
    nullable: true,
    description: 'Lookup the specified Community',
  })
  async community(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.READ,
      `lookup Community: ${community.id}`
    );

    return community;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => ICollaboration, {
    nullable: true,
    description: 'Lookup the specified Collaboration',
  })
  async collaboration(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ICollaboration> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      collaboration.authorization,
      AuthorizationPrivilege.READ,
      `lookup Collaboration: ${collaboration.id}`
    );

    return collaboration;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => IContext, {
    nullable: true,
    description: 'Lookup the specified Context',
  })
  async context(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IContext> {
    const context = await this.contextService.getContextOrFail(id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      context.authorization,
      AuthorizationPrivilege.READ,
      `lookup Context: ${context.id}`
    );

    return context;
  }
}
