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
import { WhiteboardTemplateService } from '@domain/template/whiteboard-template/whiteboard.template.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { PostService } from '@domain/collaboration/post/post.service';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { InnovationFlowService } from '@domain/challenge/innovation-flow/innovaton.flow.service';
import { InnovationFlowTemplateService } from '@domain/template/innovation-flow-template/innovation.flow.template.service';
import { RoomService } from '@domain/communication/room/room.service';
import { IWhiteboardTemplate } from '@domain/template/whiteboard-template/whiteboard.template.interface';
import { IProfile } from '@domain/common/profile';
import { ICallout } from '@domain/collaboration/callout';
import { IPost } from '@domain/collaboration/post/post.interface';
import { IInnovationFlow } from '@domain/challenge/innovation-flow/innovation.flow.interface';
import { IInnovationFlowTemplate } from '@domain/template/innovation-flow-template/innovation.flow.template.interface';
import { IRoom } from '@domain/communication/room/room.interface';

@Resolver(() => LookupQueryResults)
export class LookupResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private communityService: CommunityService,
    private collaborationService: CollaborationService,
    private contextService: ContextService,
    private whiteboardService: WhiteboardService,
    private whiteboardTemplateService: WhiteboardTemplateService,
    private profileService: ProfileService,
    private postService: PostService,
    private calloutService: CalloutService,
    private roomService: RoomService,
    private innovationFlowService: InnovationFlowService,
    private innovationFlowTemplateService: InnovationFlowTemplateService
  ) {}

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
  @ResolveField(() => IWhiteboardTemplate, {
    nullable: true,
    description: 'Lookup the specified Whiteboard Tmplate',
  })
  async whiteboardTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IWhiteboardTemplate> {
    const whiteboardTemplate =
      await this.whiteboardTemplateService.getWhiteboardTemplateOrFail(id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboardTemplate.authorization,
      AuthorizationPrivilege.READ,
      `lookup Whiteboard template: ${whiteboardTemplate.id}`
    );

    return whiteboardTemplate;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => IProfile, {
    nullable: true,
    description: 'Lookup the specified Profile',
  })
  async profile(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IProfile> {
    const profile = await this.profileService.getProfileOrFail(id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      profile.authorization,
      AuthorizationPrivilege.READ,
      `lookup Profile: ${profile.id}`
    );

    return profile;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => ICallout, {
    nullable: true,
    description: 'Lookup the specified Callout',
  })
  async callout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ICallout> {
    const callout = await this.calloutService.getCalloutOrFail(id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.READ,
      `lookup Callout: ${callout.id}`
    );

    return callout;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => IPost, {
    nullable: true,
    description: 'Lookup the specified Post',
  })
  async post(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IPost> {
    const post = await this.postService.getPostOrFail(id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      post.authorization,
      AuthorizationPrivilege.READ,
      `lookup Post: ${post.id}`
    );

    return post;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => IRoom, {
    nullable: true,
    description: 'Lookup the specified Room',
  })
  async room(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IRoom> {
    const room = await this.roomService.getRoomOrFail(id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      room.authorization,
      AuthorizationPrivilege.READ,
      `lookup Room: ${room.id}`
    );

    return room;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => IInnovationFlow, {
    nullable: true,
    description: 'Lookup the specified InnovationFlow',
  })
  async innovationFlow(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IInnovationFlow> {
    const innovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlow.authorization,
      AuthorizationPrivilege.READ,
      `lookup InnovationFlow: ${innovationFlow.id}`
    );

    return innovationFlow;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => IInnovationFlowTemplate, {
    nullable: true,
    description: 'Lookup the specified InnovationFlow Template',
  })
  async innovationFlowTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IInnovationFlowTemplate> {
    const innovationFlowTemplate =
      await this.innovationFlowTemplateService.getInnovationFlowTemplateOrFail(
        id
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlowTemplate.authorization,
      AuthorizationPrivilege.READ,
      `lookup InnovationFlow Template: ${innovationFlowTemplate.id}`
    );

    return innovationFlowTemplate;
  }
}
