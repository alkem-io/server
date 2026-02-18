import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IApplication } from '@domain/access/application';
import { ApplicationService } from '@domain/access/application/application.service';
import { IInvitation } from '@domain/access/invitation';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { IPlatformInvitation } from '@domain/access/invitation.platform';
import { PlatformInvitationService } from '@domain/access/invitation.platform/platform.invitation.service';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { ICalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.interface';
import { CalloutContributionService } from '@domain/collaboration/callout-contribution/callout.contribution.service';
import { ICalloutsSet } from '@domain/collaboration/callouts-set/callouts.set.interface';
import { CalloutsSetService } from '@domain/collaboration/callouts-set/callouts.set.service';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { IInnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.interface';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { IPost } from '@domain/collaboration/post/post.interface';
import { PostService } from '@domain/collaboration/post/post.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IKnowledgeBase } from '@domain/common/knowledge-base/knowledge.base.interface';
import { KnowledgeBaseService } from '@domain/common/knowledge-base/knowledge.base.service';
import { ILicense } from '@domain/common/license/license.interface';
import { LicenseService } from '@domain/common/license/license.service';
import { MemoService } from '@domain/common/memo';
import { IMemo } from '@domain/common/memo/types';
import { IProfile } from '@domain/common/profile';
import { ProfileService } from '@domain/common/profile/profile.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { WhiteboardService } from '@domain/common/whiteboard';
import { IWhiteboard } from '@domain/common/whiteboard/types';
import { IConversation } from '@domain/communication/conversation/conversation.interface';
import { ConversationService } from '@domain/communication/conversation/conversation.service';
import { IRoom } from '@domain/communication/room/room.interface';
import { RoomService } from '@domain/communication/room/room.service';
import { ICommunity } from '@domain/community/community/community.interface';
import { CommunityService } from '@domain/community/community/community.service';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { IAccount } from '@domain/space/account/account.interface';
import { AccountService } from '@domain/space/account/account.service';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceService } from '@domain/space/space/space.service';
import { ISpaceAbout } from '@domain/space/space.about';
import { SpaceAboutService } from '@domain/space/space.about/space.about.service';
import { IDocument } from '@domain/storage/document';
import { DocumentService } from '@domain/storage/document/document.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { ITemplate } from '@domain/template/template/template.interface';
import { TemplateService } from '@domain/template/template/template.service';
import { ITemplateContentSpace } from '@domain/template/template-content-space/template.content.space.interface';
import { TemplateContentSpaceService } from '@domain/template/template-content-space/template.content.space.service';
import { ITemplatesManager } from '@domain/template/templates-manager/templates.manager.interface';
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';
import { ITemplatesSet } from '@domain/template/templates-set/templates.set.interface';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { ICalendar } from '@domain/timeline/calendar/calendar.interface';
import { CalendarService } from '@domain/timeline/calendar/calendar.service';
import { ICalendarEvent } from '@domain/timeline/event';
import { CalendarEventService } from '@domain/timeline/event/event.service';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { CurrentActor } from '@src/common/decorators';
import { LookupMyPrivilegesQueryResults } from './dto/lookup.query.my.privileges.results';
import { LookupQueryResults } from './dto/lookup.query.results';

@Resolver(() => LookupQueryResults)
export class LookupResolverFields {
  constructor(
    private accountService: AccountService,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private communityService: CommunityService,
    private applicationService: ApplicationService,
    private invitationService: InvitationService,
    private platformInvitationService: PlatformInvitationService,
    private collaborationService: CollaborationService,
    private spaceAboutService: SpaceAboutService,
    private whiteboardService: WhiteboardService,
    private memoService: MemoService,
    private innovationPackService: InnovationPackService,
    private organizationLookupService: OrganizationLookupService,
    private profileService: ProfileService,
    private postService: PostService,
    private calloutsSetService: CalloutsSetService,
    private calloutService: CalloutService,
    private contributionService: CalloutContributionService,
    private roomService: RoomService,
    private innovationFlowService: InnovationFlowService,
    private calendarEventService: CalendarEventService,
    private calendarService: CalendarService,
    private documentService: DocumentService,
    private templateService: TemplateService,
    private templatesSetService: TemplatesSetService,
    private templatesManagerService: TemplatesManagerService,
    private storageAggregatorService: StorageAggregatorService,
    private storageBucketService: StorageBucketService,
    private spaceService: SpaceService,
    private userLookupService: UserLookupService,
    private guidelinesService: CommunityGuidelinesService,
    private virtualContributorService: VirtualContributorService,
    private innovationHubService: InnovationHubService,
    private roleSetService: RoleSetService,
    private licenseService: LicenseService,
    private knowledgeBaseService: KnowledgeBaseService,
    private templateContentSpaceService: TemplateContentSpaceService,
    private conversationService: ConversationService
  ) {}

  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'Lookup the specified Space',
  })
  async space(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      space.authorization,
      AuthorizationPrivilege.READ_ABOUT,
      `lookup Space: ${space.id}`
    );

    return space;
  }

  @ResolveField(() => IAccount, {
    nullable: true,
    description: 'Lookup the specified Account',
  })
  async account(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAccount> {
    const account = await this.accountService.getAccountOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      account.authorization,
      AuthorizationPrivilege.READ,
      `lookup Account: ${account.id}`
    );

    return account;
  }

  @ResolveField(() => IConversation, {
    nullable: true,
    description: 'Lookup the specified Conversation',
  })
  async conversation(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IConversation> {
    const conversation =
      await this.conversationService.getConversationOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      conversation.authorization,
      AuthorizationPrivilege.READ,
      `lookup Conversation: ${conversation.id}`
    );

    return conversation;
  }

  @ResolveField(() => IOrganization, {
    nullable: true,
    description: 'Lookup the specified Organization using a ID',
  })
  async organization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IOrganization> {
    return await this.organizationLookupService.getOrganizationByIdOrFail(id);
  }

  @ResolveField(() => LookupMyPrivilegesQueryResults, {
    nullable: true,
    description: 'Lookup myPrivileges on the specified entity.',
  })
  myPrivileges(): LookupMyPrivilegesQueryResults {
    return {} as LookupMyPrivilegesQueryResults;
  }

  @ResolveField(() => IRoleSet, {
    nullable: true,
    description: 'Lookup the specified RoleSet',
  })
  async roleSet(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IRoleSet> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(id);
    // Note: RoleSet is publicly accessible for information such as RoleDefinitions, so do not check for READ access here
    // this.authorizationService.grantAccessOrFail(
    //   actorContext,
    //   roleSet.authorization,
    //   AuthorizationPrivilege.READ,
    //   `lookup RoleSet: ${roleSet.id}`
    // );

    return roleSet;
  }

  @ResolveField(() => IDocument, {
    nullable: true,
    description: 'Lookup the specified Document',
  })
  async document(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IDocument> {
    const document = await this.documentService.getDocumentOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      document.authorization,
      AuthorizationPrivilege.READ,
      `lookup Document: ${document.id}`
    );

    return document;
  }

  @ResolveField(() => IVirtualContributor, {
    nullable: true,
    description: 'A particular VirtualContributor',
  })
  async virtualContributor(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID, nullable: false }) id: string
  ): Promise<IVirtualContributor> {
    const virtualContributor =
      await this.virtualContributorService.getVirtualContributorByIdOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      virtualContributor.authorization,
      AuthorizationPrivilege.READ,
      `lookup VirtualContributor: ${virtualContributor.id}`
    );
    return virtualContributor;
  }

  @ResolveField(() => IUser, {
    nullable: true,
    description: 'A particular User',
  })
  async user(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID, nullable: false }) id: string
  ): Promise<IUser> {
    const user = await this.userLookupService.getUserByIdOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      user.authorization,
      AuthorizationPrivilege.READ,
      `lookup User: ${user.id}`
    );
    return user;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified Authorization Policy',
  })
  async authorizationPolicy(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    // Note: this is a special case, mostly to track down issues related to authorization policies, so restrict access to platform admins
    const authorizationPolicy =
      await this.authorizationPolicyService.getAuthorizationPolicyOrFail(id);
    const platformAuthorization =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformAuthorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `lookup AuthorizationPolicy: ${authorizationPolicy.id}`
    );

    return authorizationPolicy;
  }

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
    @CurrentActor() actorContext: ActorContext,
    @Args('userID', { type: () => UUID }) userID: string,
    @Args('authorizationPolicyID', { type: () => UUID })
    authorizationPolicyID: string
  ): Promise<AuthorizationPrivilege[]> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `user privileges field: ${actorContext.actorId}`
    );
    const authorization =
      await this.authorizationPolicyService.getAuthorizationPolicyOrFail(
        authorizationPolicyID
      );
    const user = await this.userLookupService.getUserByIdOrFail(userID, {
      relations: { credentials: true },
    });
    return this.authorizationService.getGrantedPrivileges(
      user.credentials || [],
      authorization
    );
  }

  @ResolveField(() => IStorageAggregator, {
    nullable: true,
    description: 'Lookup the specified StorageAggregator',
  })
  async storageAggregator(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IStorageAggregator> {
    const document =
      await this.storageAggregatorService.getStorageAggregatorOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      document.authorization,
      AuthorizationPrivilege.READ,
      `lookup StorageAggregator: ${document.id}`
    );

    return document;
  }

  @ResolveField(() => IInnovationPack, {
    nullable: true,
    description: 'Lookup the specified InnovationPack',
  })
  async innovationPack(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IInnovationPack> {
    const innovationPack =
      await this.innovationPackService.getInnovationPackOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      innovationPack.authorization,
      AuthorizationPrivilege.READ,
      `lookup InnovationPack: ${innovationPack.id}`
    );

    return innovationPack;
  }

  @ResolveField(() => IStorageBucket, {
    nullable: true,
    description: 'Lookup the specified StorageBucket',
  })
  async storageBucket(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IStorageBucket> {
    const document = await this.storageBucketService.getStorageBucketOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      document.authorization,
      AuthorizationPrivilege.READ,
      `lookup StorageBucket: ${document.id}`
    );

    return document;
  }

  @ResolveField(() => IInnovationHub, {
    nullable: true,
    description: 'Lookup the specified InnovationHub',
  })
  async innovationHub(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IInnovationHub> {
    const innovationHub =
      await this.innovationHubService.getInnovationHubOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      innovationHub.authorization,
      AuthorizationPrivilege.READ,
      `lookup InnovationHub: ${innovationHub.id}`
    );

    return innovationHub;
  }

  @ResolveField(() => IApplication, {
    nullable: true,
    description: 'Lookup the specified Application',
  })
  async application(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IApplication> {
    const application = await this.applicationService.getApplicationOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      application.authorization,
      AuthorizationPrivilege.READ,
      `lookup Application: ${application.id}`
    );

    return application;
  }

  @ResolveField(() => IInvitation, {
    nullable: true,
    description: 'Lookup the specified Invitation',
  })
  async invitation(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IInvitation> {
    const invitation = await this.invitationService.getInvitationOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      invitation.authorization,
      AuthorizationPrivilege.READ,
      `lookup Invitation: ${invitation.id}`
    );

    return invitation;
  }

  @ResolveField(() => IPlatformInvitation, {
    nullable: true,
    description: 'Lookup the specified PlatformInvitation',
  })
  async platformInvitation(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IPlatformInvitation> {
    const platformInvitation =
      await this.platformInvitationService.getPlatformInvitationOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformInvitation.authorization,
      AuthorizationPrivilege.READ,
      `lookup Platform Invitation: ${platformInvitation.id}`
    );

    return platformInvitation;
  }

  @ResolveField(() => ICommunity, {
    nullable: true,
    description: 'Lookup the specified Community',
  })
  async community(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(id);
    // Do not check for READ access here, rely on per field check on resolver in Community
    // await this.authorizationService.grantAccessOrFail(
    //   actorContext,
    //   community.authorization,
    //   AuthorizationPrivilege.READ,
    //   `lookup Community: ${community.id}`
    // );

    return community;
  }

  @ResolveField(() => ICollaboration, {
    nullable: true,
    description: 'Lookup the specified Collaboration',
  })
  async collaboration(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ICollaboration> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(id);

    return collaboration;
  }

  @ResolveField(() => ICalendarEvent, {
    nullable: true,
    description: 'Lookup the specified CalendarEvent',
  })
  async calendarEvent(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ICalendarEvent> {
    const calendarEvent =
      await this.calendarEventService.getCalendarEventOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      calendarEvent.authorization,
      AuthorizationPrivilege.READ,
      `lookup calendar event: ${calendarEvent.id}`
    );

    return calendarEvent;
  }

  @ResolveField(() => ICalloutsSet, {
    nullable: true,
    description: 'Lookup the specified CalloutsSet',
  })
  async calloutsSet(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ICalloutsSet> {
    const calloutsSet = await this.calloutsSetService.getCalloutsSetOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      calloutsSet.authorization,
      AuthorizationPrivilege.READ,
      `lookup calloutsSet: ${calloutsSet.id}`
    );

    return calloutsSet;
  }

  @ResolveField(() => ICalendar, {
    nullable: true,
    description: 'Lookup the specified Calendar',
  })
  async calendar(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ICalendar> {
    const calendar = await this.calendarService.getCalendarOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      calendar.authorization,
      AuthorizationPrivilege.READ,
      `lookup calendar : ${calendar.id}`
    );

    return calendar;
  }

  @ResolveField(() => ISpaceAbout, {
    nullable: true,
    description: 'Lookup the specified SpaceAbout',
  })
  async about(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ISpaceAbout> {
    const about = await this.spaceAboutService.getSpaceAboutOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      about.authorization,
      AuthorizationPrivilege.READ,
      `lookup SpaceAbout: ${about.id}`
    );

    return about;
  }

  @ResolveField(() => IWhiteboard, {
    nullable: true,
    description: 'Lookup the specified Whiteboard',
  })
  async whiteboard(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IWhiteboard> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      whiteboard.authorization,
      AuthorizationPrivilege.READ,
      `lookup Whiteboard: ${whiteboard.id}`
    );

    return whiteboard;
  }

  @ResolveField(() => IMemo, {
    nullable: true,
    description: 'Lookup the specified Memo',
  })
  async memo(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IMemo> {
    const memo = await this.memoService.getMemoOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      memo.authorization,
      AuthorizationPrivilege.READ,
      `lookup Memo: ${memo.id}`
    );

    return memo;
  }

  @ResolveField(() => IProfile, {
    nullable: true,
    description: 'Lookup the specified Profile',
  })
  async profile(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IProfile> {
    const profile = await this.profileService.getProfileOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      profile.authorization,
      AuthorizationPrivilege.READ,
      `lookup Profile: ${profile.id}`
    );

    return profile;
  }

  @ResolveField(() => ICallout, {
    nullable: true,
    description: 'Lookup the specified Callout',
  })
  async callout(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ICallout> {
    const callout = await this.calloutService.getCalloutOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      callout.authorization,
      AuthorizationPrivilege.READ,
      `lookup Callout: ${callout.id}`
    );

    return callout;
  }

  @ResolveField(() => ICalloutContribution, {
    nullable: true,
    description: 'Lookup the specified CalloutContribution',
  })
  async contribution(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ICalloutContribution> {
    const contribution =
      await this.contributionService.getCalloutContributionOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      contribution.authorization,
      AuthorizationPrivilege.READ,
      `lookup CalloutContribution: ${contribution.id}`
    );

    return contribution;
  }

  @ResolveField(() => IPost, {
    nullable: true,
    description: 'Lookup the specified Post',
  })
  async post(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IPost> {
    const post = await this.postService.getPostOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      post.authorization,
      AuthorizationPrivilege.READ,
      `lookup Post: ${post.id}`
    );

    return post;
  }

  @ResolveField(() => IRoom, {
    nullable: true,
    description: 'Lookup the specified Room',
  })
  async room(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IRoom> {
    const room = await this.roomService.getRoomOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      room.authorization,
      AuthorizationPrivilege.READ,
      `lookup Room: ${room.id}`
    );

    return room;
  }

  @ResolveField(() => IInnovationFlow, {
    nullable: true,
    description: 'Lookup the specified InnovationFlow',
  })
  async innovationFlow(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IInnovationFlow> {
    const innovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      innovationFlow.authorization,
      AuthorizationPrivilege.READ,
      `lookup InnovationFlow: ${innovationFlow.id}`
    );

    return innovationFlow;
  }

  @ResolveField(() => ITemplate, {
    nullable: true,
    description: 'Lookup the specified Template',
  })
  async template(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ITemplate> {
    const template = await this.templateService.getTemplateOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      template.authorization,
      AuthorizationPrivilege.READ,
      `lookup Template: ${template.id}`
    );

    return template;
  }

  @ResolveField(() => ITemplateContentSpace, {
    nullable: true,
    description: 'Lookup the specified Space Content Template',
  })
  async templateContentSpace(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ITemplateContentSpace> {
    const template =
      await this.templateContentSpaceService.getTemplateContentSpaceOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      template.authorization,
      AuthorizationPrivilege.READ,
      `lookup TemplateContentSpace: ${template.id}`
    );

    return template;
  }

  @ResolveField(() => ITemplatesSet, {
    nullable: true,
    description: 'Lookup the specified TemplatesSet',
  })
  async templatesSet(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ITemplatesSet> {
    const templatesSet =
      await this.templatesSetService.getTemplatesSetOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      templatesSet.authorization,
      AuthorizationPrivilege.READ,
      `lookup TemplatesSet: ${templatesSet.id}`
    );

    return templatesSet;
  }

  @ResolveField(() => ITemplatesManager, {
    nullable: true,
    description: 'Lookup the specified TemplatesManager',
  })
  async templatesManager(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ITemplatesManager> {
    const templatesManager =
      await this.templatesManagerService.getTemplatesManagerOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      templatesManager.authorization,
      AuthorizationPrivilege.READ,
      `lookup TemplatesManager: ${templatesManager.id}`
    );

    return templatesManager;
  }

  @ResolveField(() => ICommunityGuidelines, {
    nullable: true,
    description: 'Lookup the specified Community guidelines',
  })
  async communityGuidelines(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ICommunityGuidelines> {
    const guidelines =
      await this.guidelinesService.getCommunityGuidelinesOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      guidelines.authorization,
      AuthorizationPrivilege.READ,
      `lookup Community guidelines: ${guidelines.id}`
    );

    return guidelines;
  }

  @ResolveField(() => ILicense, {
    nullable: true,
    description: 'Lookup the specified License',
  })
  async license(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ILicense> {
    const license = await this.licenseService.getLicenseOrFail(id);

    return license;
  }

  @ResolveField(() => IKnowledgeBase, {
    nullable: false,
    description: 'Lookup as specific KnowledgeBase',
  })
  async knowledgeBase(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID, nullable: false }) id: string
  ): Promise<IKnowledgeBase> {
    const knowledgeBase =
      await this.knowledgeBaseService.getKnowledgeBaseOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      knowledgeBase.authorization,
      AuthorizationPrivilege.READ_ABOUT,
      `lookup KnowledgeBase: ${knowledgeBase.id}`
    );
    return knowledgeBase;
  }
}
