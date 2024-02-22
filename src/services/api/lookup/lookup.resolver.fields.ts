import { Args, Resolver } from '@nestjs/graphql';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '@src/common/decorators';
import { ResolveField } from '@nestjs/graphql';
import { AgentInfo } from '@core/authentication.agent.info/agent-info';
import { LookupQueryResults } from './dto/lookup.query.results';
import { UUID } from '@domain/common/scalars/scalar.uuid';
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
import { CalendarEventService } from '@domain/timeline/event/event.service';
import { ICalendarEvent } from '@domain/timeline/event';
import { ICalendar } from '@domain/timeline/calendar/calendar.interface';
import { CalendarService } from '@domain/timeline/calendar/calendar.service';
import { ApplicationService } from '@domain/community/application/application.service';
import { InvitationService } from '@domain/community/invitation/invitation.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { IApplication } from '@domain/community/application';
import { IInvitation } from '@domain/community/invitation';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { CalloutTemplateService } from '@domain/template/callout-template/callout.template.service';
import { ICalloutTemplate } from '@domain/template/callout-template/callout.template.interface';
import { WhiteboardService } from '@domain/common/whiteboard';
import { IWhiteboard } from '@domain/common/whiteboard/types';
import { DocumentService } from '@domain/storage/document/document.service';
import { IDocument } from '@domain/storage/document';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { UserService } from '@domain/community/user/user.service';

@Resolver(() => LookupQueryResults)
export class LookupResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private communityService: CommunityService,
    private applicationService: ApplicationService,
    private invitationService: InvitationService,
    private challengeService: ChallengeService,
    private opportunityService: OpportunityService,
    private collaborationService: CollaborationService,
    private contextService: ContextService,
    private whiteboardService: WhiteboardService,
    private whiteboardTemplateService: WhiteboardTemplateService,
    private calloutTemplateService: CalloutTemplateService,
    private profileService: ProfileService,
    private postService: PostService,
    private calloutService: CalloutService,
    private roomService: RoomService,
    private innovationFlowService: InnovationFlowService,
    private calendarEventService: CalendarEventService,
    private calendarService: CalendarService,
    private documentService: DocumentService,
    private innovationFlowTemplateService: InnovationFlowTemplateService,
    private storageAggregatorService: StorageAggregatorService,
    private userService: UserService
  ) {}

  @UseGuards(GraphqlGuard)
  @ResolveField(() => IDocument, {
    nullable: true,
    description: 'Lookup the specified Document',
  })
  async document(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IDocument> {
    const document = await this.documentService.getDocumentOrFail(id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      document.authorization,
      AuthorizationPrivilege.READ,
      `lookup Document: ${document.id}`
    );

    return document;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified Authorization Policy',
  })
  async authorizationPolicy(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    // Note: this is a special case, mostly to track down issues related to authorization policies, so restrict access to platform admins
    const authorizationPolicy =
      await this.authorizationPolicyService.getAuthorizationPolicyOrFail(id);
    const platformAuthorization =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformAuthorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `lookup AuthorizationPolicy: ${authorizationPolicy.id}`
    );

    return authorizationPolicy;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(
    'authorizationPrivilegesForUser',
    () => [AuthorizationPrivilege],
    {
      nullable: true,
      description:
        'The privileges granted to the specified user based on this Authorization Policy.',
    }
  )
  async authorizationPrivilegesForUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('userID', { type: () => UUID }) userID: string,
    @Args('authorizationID', { type: () => UUID }) authorizationID: string
  ): Promise<AuthorizationPrivilege[]> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `user privileges field: ${agentInfo.email}`
    );
    const authorization =
      await this.authorizationPolicyService.getAuthorizationPolicyOrFail(
        authorizationID
      );
    const agent = await this.userService.getAgent(userID);
    return this.authorizationService.getGrantedPrivileges(
      agent.credentials || [],
      [],
      authorization
    );
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => IStorageAggregator, {
    nullable: true,
    description: 'Lookup the specified StorageAggregator',
  })
  async storageAggregator(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IStorageAggregator> {
    const document =
      await this.storageAggregatorService.getStorageAggregatorOrFail(id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      document.authorization,
      AuthorizationPrivilege.READ,
      `lookup StorageAggregator: ${document.id}`
    );

    return document;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => IApplication, {
    nullable: true,
    description: 'Lookup the specified Application',
  })
  async application(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IApplication> {
    const application = await this.applicationService.getApplicationOrFail(id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      application.authorization,
      AuthorizationPrivilege.READ,
      `lookup Application: ${application.id}`
    );

    return application;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => IInvitation, {
    nullable: true,
    description: 'Lookup the specified Invitation',
  })
  async invitation(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IInvitation> {
    const invitation = await this.invitationService.getInvitationOrFail(id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      invitation.authorization,
      AuthorizationPrivilege.READ,
      `lookup Invitation: ${invitation.id}`
    );

    return invitation;
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
  @ResolveField(() => ICalendarEvent, {
    nullable: true,
    description: 'Lookup the specified CalendarEvent',
  })
  async calendarEvent(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ICalendarEvent> {
    const calendarEvent =
      await this.calendarEventService.getCalendarEventOrFail(id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      calendarEvent.authorization,
      AuthorizationPrivilege.READ,
      `lookup calendar event: ${calendarEvent.id}`
    );

    return calendarEvent;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => ICalendar, {
    nullable: true,
    description: 'Lookup the specified Calendar',
  })
  async calendar(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ICalendar> {
    const calendar = await this.calendarService.getCalendarOrFail(id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      calendar.authorization,
      AuthorizationPrivilege.READ,
      `lookup calendar : ${calendar.id}`
    );

    return calendar;
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
    this.authorizationService.grantAccessOrFail(
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
    this.authorizationService.grantAccessOrFail(
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
    description: 'Lookup the specified Whiteboard Template',
  })
  async whiteboardTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IWhiteboardTemplate> {
    const whiteboardTemplate =
      await this.whiteboardTemplateService.getWhiteboardTemplateOrFail(id);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboardTemplate.authorization,
      AuthorizationPrivilege.READ,
      `lookup Whiteboard template: ${whiteboardTemplate.id}`
    );

    return whiteboardTemplate;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => ICalloutTemplate, {
    nullable: true,
    description: 'Lookup the specified Callout Template',
  })
  async calloutTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ICalloutTemplate> {
    const calloutTemplate =
      await this.calloutTemplateService.getCalloutTemplateOrFail(id);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      calloutTemplate.authorization,
      AuthorizationPrivilege.READ,
      `lookup Callout template: ${calloutTemplate.id}`
    );

    return calloutTemplate;
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
    this.authorizationService.grantAccessOrFail(
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
    this.authorizationService.grantAccessOrFail(
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
    this.authorizationService.grantAccessOrFail(
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
    this.authorizationService.grantAccessOrFail(
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
    this.authorizationService.grantAccessOrFail(
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
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlowTemplate.authorization,
      AuthorizationPrivilege.READ,
      `lookup InnovationFlow Template: ${innovationFlowTemplate.id}`
    );

    return innovationFlowTemplate;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => IChallenge, {
    nullable: true,
    description: 'Lookup the specified Challenge',
  })
  async challenge(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IChallenge> {
    const challenge = await this.challengeService.getChallengeOrFail(id);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      challenge.authorization,
      AuthorizationPrivilege.READ,
      `lookup Challenge: ${challenge.id}`
    );

    return challenge;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => IOpportunity, {
    nullable: true,
    description: 'Lookup the specified Opportunity',
  })
  async opportunity(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(id);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      opportunity.authorization,
      AuthorizationPrivilege.READ,
      `lookup Opportunity: ${opportunity.id}`
    );

    return opportunity;
  }
}
