import { AuthorizationService } from '@core/authorization/authorization.service';
import { ApplicationService } from '@domain/access/application/application.service';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { PlatformInvitationService } from '@domain/access/invitation.platform/platform.invitation.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CalloutContributionService } from '@domain/collaboration/callout-contribution/callout.contribution.service';
import { CalloutsSetService } from '@domain/collaboration/callouts-set/callouts.set.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { PostService } from '@domain/collaboration/post/post.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { KnowledgeBaseService } from '@domain/common/knowledge-base/knowledge.base.service';
import { LicenseService } from '@domain/common/license/license.service';
import { MemoService } from '@domain/common/memo';
import { ProfileService } from '@domain/common/profile/profile.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { ConversationService } from '@domain/communication/conversation/conversation.service';
import { RoomService } from '@domain/communication/room/room.service';
import { CommunityService } from '@domain/community/community/community.service';
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { AccountService } from '@domain/space/account/account.service';
import { SpaceService } from '@domain/space/space/space.service';
import { SpaceAboutService } from '@domain/space/space.about/space.about.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { TemplateService } from '@domain/template/template/template.service';
import { TemplateContentSpaceService } from '@domain/template/template-content-space/template.content.space.service';
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { CalendarService } from '@domain/timeline/calendar/calendar.service';
import { CalendarEventService } from '@domain/timeline/event/event.service';
import { createMock } from '@golevelup/ts-vitest';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { LookupResolverFields } from './lookup.resolver.fields';

const mockAuth = { id: 'auth-1' };
const mockEntity = (id = 'entity-1') => ({
  id,
  authorization: mockAuth,
});
const actorContext = { actorID: 'user-1' } as any;

describe('LookupResolverFields', () => {
  let resolver: LookupResolverFields;

  beforeEach(() => {
    const authService = createMock<AuthorizationService>();
    const spaceService = createMock<SpaceService>();
    spaceService.getSpaceOrFail.mockResolvedValue(mockEntity() as any);
    const accountService = createMock<AccountService>();
    accountService.getAccountOrFail.mockResolvedValue(mockEntity() as any);
    const organizationLookupService = createMock<OrganizationLookupService>();
    organizationLookupService.getOrganizationByIdOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const roleSetService = createMock<RoleSetService>();
    roleSetService.getRoleSetOrFail.mockResolvedValue(mockEntity() as any);
    const documentService = createMock<DocumentService>();
    documentService.getDocumentOrFail.mockResolvedValue(mockEntity() as any);
    const vcService = createMock<VirtualContributorService>();
    vcService.getVirtualContributorByIdOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const userLookupService = createMock<UserLookupService>();
    userLookupService.getUserByIdOrFail.mockResolvedValue(mockEntity() as any);
    const authPolicyService = createMock<AuthorizationPolicyService>();
    authPolicyService.getAuthorizationPolicyOrFail.mockResolvedValue(
      mockAuth as any
    );
    const platformAuthService =
      createMock<PlatformAuthorizationPolicyService>();
    platformAuthService.getPlatformAuthorizationPolicy.mockResolvedValue(
      mockAuth as any
    );
    const storageAggService = createMock<StorageAggregatorService>();
    storageAggService.getStorageAggregatorOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const innovationPackService = createMock<InnovationPackService>();
    innovationPackService.getInnovationPackOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const storageBucketService = createMock<StorageBucketService>();
    storageBucketService.getStorageBucketOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const innovationHubService = createMock<InnovationHubService>();
    innovationHubService.getInnovationHubOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const applicationService = createMock<ApplicationService>();
    applicationService.getApplicationOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const invitationService = createMock<InvitationService>();
    invitationService.getInvitationOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const platformInvitationService = createMock<PlatformInvitationService>();
    platformInvitationService.getPlatformInvitationOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const communityService = createMock<CommunityService>();
    communityService.getCommunityOrFail.mockResolvedValue(mockEntity() as any);
    const collaborationService = createMock<CollaborationService>();
    collaborationService.getCollaborationOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const calendarEventService = createMock<CalendarEventService>();
    calendarEventService.getCalendarEventOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const calloutsSetService = createMock<CalloutsSetService>();
    calloutsSetService.getCalloutsSetOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const calendarService = createMock<CalendarService>();
    calendarService.getCalendarOrFail.mockResolvedValue(mockEntity() as any);
    const spaceAboutService = createMock<SpaceAboutService>();
    spaceAboutService.getSpaceAboutOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const whiteboardService = createMock<WhiteboardService>();
    whiteboardService.getWhiteboardOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const memoService = createMock<MemoService>();
    memoService.getMemoOrFail.mockResolvedValue(mockEntity() as any);
    const profileService = createMock<ProfileService>();
    profileService.getProfileOrFail.mockResolvedValue(mockEntity() as any);
    const calloutService = createMock<CalloutService>();
    calloutService.getCalloutOrFail.mockResolvedValue(mockEntity() as any);
    const contributionService = createMock<CalloutContributionService>();
    contributionService.getCalloutContributionOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const postService = createMock<PostService>();
    postService.getPostOrFail.mockResolvedValue(mockEntity() as any);
    const roomService = createMock<RoomService>();
    roomService.getRoomOrFail.mockResolvedValue(mockEntity() as any);
    const innovationFlowService = createMock<InnovationFlowService>();
    innovationFlowService.getInnovationFlowOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const templateService = createMock<TemplateService>();
    templateService.getTemplateOrFail.mockResolvedValue(mockEntity() as any);
    const templateContentSpaceService =
      createMock<TemplateContentSpaceService>();
    templateContentSpaceService.getTemplateContentSpaceOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const templatesSetService = createMock<TemplatesSetService>();
    templatesSetService.getTemplatesSetOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const templatesManagerService = createMock<TemplatesManagerService>();
    templatesManagerService.getTemplatesManagerOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const guidelinesService = createMock<CommunityGuidelinesService>();
    guidelinesService.getCommunityGuidelinesOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const licenseService = createMock<LicenseService>();
    licenseService.getLicenseOrFail.mockResolvedValue(mockEntity() as any);
    const knowledgeBaseService = createMock<KnowledgeBaseService>();
    knowledgeBaseService.getKnowledgeBaseOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const conversationService = createMock<ConversationService>();
    conversationService.getConversationOrFail.mockResolvedValue(
      mockEntity() as any
    );

    resolver = new LookupResolverFields(
      accountService,
      authService,
      authPolicyService,
      platformAuthService,
      communityService,
      applicationService,
      invitationService,
      platformInvitationService,
      collaborationService,
      spaceAboutService,
      whiteboardService,
      memoService,
      innovationPackService,
      organizationLookupService,
      profileService,
      postService,
      calloutsSetService,
      calloutService,
      contributionService,
      roomService,
      innovationFlowService,
      calendarEventService,
      calendarService,
      documentService,
      templateService,
      templatesSetService,
      templatesManagerService,
      storageAggService,
      storageBucketService,
      spaceService,
      userLookupService,
      guidelinesService,
      vcService,
      innovationHubService,
      roleSetService,
      licenseService,
      knowledgeBaseService,
      templateContentSpaceService,
      conversationService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should resolve space', async () => {
    const result = await resolver.space(actorContext, 'id-1');
    expect(result).toBeDefined();
    expect(result.id).toBe('entity-1');
  });

  it('should resolve account', async () => {
    const result = await resolver.account(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve conversation', async () => {
    const result = await resolver.conversation(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve organization', async () => {
    const result = await resolver.organization('id-1');
    expect(result).toBeDefined();
  });

  it('should resolve myPrivileges', () => {
    const result = resolver.myPrivileges();
    expect(result).toBeDefined();
  });

  it('should resolve roleSet', async () => {
    const result = await resolver.roleSet('id-1');
    expect(result).toBeDefined();
  });

  it('should resolve document', async () => {
    const result = await resolver.document(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve virtualContributor', async () => {
    const result = await resolver.virtualContributor(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve user', async () => {
    const result = await resolver.user(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve authorizationPolicy', async () => {
    const result = await resolver.authorizationPolicy(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve authorizationPrivilegesForUser', async () => {
    const result = await resolver.authorizationPrivilegesForUser(
      actorContext,
      'user-id',
      'auth-id'
    );
    expect(result).toBeDefined();
  });

  it('should resolve storageAggregator', async () => {
    const result = await resolver.storageAggregator(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve innovationPack', async () => {
    const result = await resolver.innovationPack(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve storageBucket', async () => {
    const result = await resolver.storageBucket(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve innovationHub', async () => {
    const result = await resolver.innovationHub(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve application', async () => {
    const result = await resolver.application(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve invitation', async () => {
    const result = await resolver.invitation(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve platformInvitation', async () => {
    const result = await resolver.platformInvitation(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve community', async () => {
    const result = await resolver.community('id-1');
    expect(result).toBeDefined();
  });

  it('should resolve collaboration', async () => {
    const result = await resolver.collaboration(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve calendarEvent', async () => {
    const result = await resolver.calendarEvent(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve calloutsSet', async () => {
    const result = await resolver.calloutsSet(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve calendar', async () => {
    const result = await resolver.calendar(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve about', async () => {
    const result = await resolver.about(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve whiteboard', async () => {
    const result = await resolver.whiteboard(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve memo', async () => {
    const result = await resolver.memo(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve profile', async () => {
    const result = await resolver.profile(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve callout', async () => {
    const result = await resolver.callout(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve contribution', async () => {
    const result = await resolver.contribution(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve post', async () => {
    const result = await resolver.post(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve room', async () => {
    const result = await resolver.room(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve innovationFlow', async () => {
    const result = await resolver.innovationFlow(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve template', async () => {
    const result = await resolver.template(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve templateContentSpace', async () => {
    const result = await resolver.templateContentSpace(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve templatesSet', async () => {
    const result = await resolver.templatesSet(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve templatesManager', async () => {
    const result = await resolver.templatesManager(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve communityGuidelines', async () => {
    const result = await resolver.communityGuidelines(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should resolve license', async () => {
    const result = await resolver.license('id-1');
    expect(result).toBeDefined();
  });

  it('should resolve knowledgeBase', async () => {
    const result = await resolver.knowledgeBase(actorContext, 'id-1');
    expect(result).toBeDefined();
  });
});
