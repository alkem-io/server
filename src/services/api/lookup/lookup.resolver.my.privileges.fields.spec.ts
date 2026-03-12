import { ApplicationService } from '@domain/access/application/application.service';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { PostService } from '@domain/collaboration/post/post.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseService } from '@domain/common/license/license.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { RoomService } from '@domain/communication/room/room.service';
import { CommunityService } from '@domain/community/community/community.service';
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';
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
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { CalendarService } from '@domain/timeline/calendar/calendar.service';
import { CalendarEventService } from '@domain/timeline/event/event.service';
import { createMock } from '@golevelup/ts-vitest';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { LookupMyPrivilegesResolverFields } from './lookup.resolver.my.privileges.fields';

const mockAuth = { id: 'auth-1' };
const mockEntity = (id = 'entity-1') => ({
  id,
  authorization: mockAuth,
});
const actorContext = { actorID: 'user-1' } as any;

describe('LookupMyPrivilegesResolverFields', () => {
  let resolver: LookupMyPrivilegesResolverFields;
  let authPolicyService: AuthorizationPolicyService;

  beforeEach(() => {
    authPolicyService = createMock<AuthorizationPolicyService>();
    (authPolicyService.getAgentPrivileges as any).mockReturnValue([
      'READ',
    ] as any);
    const accountService = createMock<AccountService>();
    accountService.getAccountOrFail.mockResolvedValue(mockEntity() as any);
    const communityService = createMock<CommunityService>();
    communityService.getCommunityOrFail.mockResolvedValue(mockEntity() as any);
    const applicationService = createMock<ApplicationService>();
    applicationService.getApplicationOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const invitationService = createMock<InvitationService>();
    invitationService.getInvitationOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const roleSetService = createMock<RoleSetService>();
    roleSetService.getRoleSetOrFail.mockResolvedValue(mockEntity() as any);
    const collaborationService = createMock<CollaborationService>();
    collaborationService.getCollaborationOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const whiteboardService = createMock<WhiteboardService>();
    whiteboardService.getWhiteboardOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const innovationPackService = createMock<InnovationPackService>();
    innovationPackService.getInnovationPackOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const profileService = createMock<ProfileService>();
    profileService.getProfileOrFail.mockResolvedValue(mockEntity() as any);
    const postService = createMock<PostService>();
    postService.getPostOrFail.mockResolvedValue(mockEntity() as any);
    const calloutService = createMock<CalloutService>();
    calloutService.getCalloutOrFail.mockResolvedValue(mockEntity() as any);
    const roomService = createMock<RoomService>();
    roomService.getRoomOrFail.mockResolvedValue(mockEntity() as any);
    const innovationFlowService = createMock<InnovationFlowService>();
    innovationFlowService.getInnovationFlowOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const calendarEventService = createMock<CalendarEventService>();
    calendarEventService.getCalendarEventOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const calendarService = createMock<CalendarService>();
    calendarService.getCalendarOrFail.mockResolvedValue(mockEntity() as any);
    const documentService = createMock<DocumentService>();
    documentService.getDocumentOrFail.mockResolvedValue(mockEntity() as any);
    const templateService = createMock<TemplateService>();
    templateService.getTemplateOrFail.mockResolvedValue(mockEntity() as any);
    const templatesSetService = createMock<TemplatesSetService>();
    templatesSetService.getTemplatesSetOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const templatesManagerService = createMock<TemplatesManagerService>();
    templatesManagerService.getTemplatesManagerOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const storageAggService = createMock<StorageAggregatorService>();
    storageAggService.getStorageAggregatorOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const storageBucketService = createMock<StorageBucketService>();
    storageBucketService.getStorageBucketOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const spaceService = createMock<SpaceService>();
    spaceService.getSpace.mockResolvedValue(mockEntity() as any);
    const spaceAboutService = createMock<SpaceAboutService>();
    spaceAboutService.getSpaceAboutOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const userLookupService = createMock<UserLookupService>();
    userLookupService.getUserByIdOrFail.mockResolvedValue(mockEntity() as any);
    const guidelinesService = createMock<CommunityGuidelinesService>();
    guidelinesService.getCommunityGuidelinesOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const vcService = createMock<VirtualContributorService>();
    vcService.getVirtualContributorByIdOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const innovationHubService = createMock<InnovationHubService>();
    innovationHubService.getInnovationHubOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const licenseService = createMock<LicenseService>();
    licenseService.getLicenseOrFail.mockResolvedValue(mockEntity() as any);

    resolver = new LookupMyPrivilegesResolverFields(
      authPolicyService,
      accountService,
      communityService,
      applicationService,
      invitationService,
      collaborationService,
      whiteboardService,
      innovationPackService,
      profileService,
      postService,
      calloutService,
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
      spaceAboutService,
      userLookupService,
      guidelinesService,
      vcService,
      innovationHubService,
      roleSetService,
      licenseService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  const methods = [
    'account',
    'roleSet',
    'document',
    'virtualContributor',
    'user',
    'storageAggregator',
    'innovationPack',
    'storageBucket',
    'innovationHub',
    'application',
    'invitation',
    'community',
    'collaboration',
    'calendarEvent',
    'calendar',
    'spaceAbout',
    'whiteboard',
    'profile',
    'callout',
    'post',
    'room',
    'innovationFlow',
    'template',
    'templatesSet',
    'templatesManager',
    'communityGuidelines',
    'license',
  ] as const;

  for (const method of methods) {
    it(`should resolve ${method}`, async () => {
      const result = await (resolver as any)[method](actorContext, 'id-1');
      expect(result).toBeDefined();
    });
  }

  it('should resolve space', async () => {
    const result = await resolver.space(actorContext, 'id-1');
    expect(result).toBeDefined();
  });

  it('should return empty array when space is null', async () => {
    // Override the mock to return null
    (resolver as any).spaceService.getSpace.mockResolvedValue(null);
    const result = await resolver.space(actorContext, 'id-1');
    expect(result).toEqual([]);
  });
});
