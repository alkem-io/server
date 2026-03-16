import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ApplicationService } from '@domain/access/application/application.service';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { PlatformInvitationService } from '@domain/access/invitation.platform/platform.invitation.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CalloutContributionService } from '@domain/collaboration/callout-contribution/callout.contribution.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { PostService } from '@domain/collaboration/post/post.service';
import { KnowledgeBaseService } from '@domain/common/knowledge-base/knowledge.base.service';
import { LicenseService } from '@domain/common/license/license.service';
import { MemoService } from '@domain/common/memo';
import { ProfileService } from '@domain/common/profile/profile.service';
import { WhiteboardService } from '@domain/common/whiteboard';
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
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { LookupResolverFields } from './lookup.resolver.fields';

describe('LookupResolverFields', () => {
  let resolver: LookupResolverFields;
  let authorizationService: { grantAccessOrFail: Mock };
  let spaceService: { getSpaceOrFail: Mock };
  let accountService: { getAccountOrFail: Mock };
  let organizationLookupService: { getOrganizationByIdOrFail: Mock };
  let userLookupService: { getUserByIdOrFail: Mock };
  let profileService: { getProfileOrFail: Mock };
  let calloutService: { getCalloutOrFail: Mock };
  let contributionService: { getCalloutContributionOrFail: Mock };
  let postService: { getPostOrFail: Mock };
  let roomService: { getRoomOrFail: Mock };
  let calendarEventService: { getCalendarEventOrFail: Mock };
  let calendarService: { getCalendarOrFail: Mock };
  let documentService: { getDocumentOrFail: Mock };
  let templateService: { getTemplateOrFail: Mock };
  let templatesSetService: { getTemplatesSetOrFail: Mock };
  let templatesManagerService: { getTemplatesManagerOrFail: Mock };
  let communityService: { getCommunityOrFail: Mock };
  let collaborationService: { getCollaborationOrFail: Mock };
  let roleSetService: { getRoleSetOrFail: Mock };
  let licenseService: { getLicenseOrFail: Mock };
  let innovationPackService: { getInnovationPackOrFail: Mock };
  let innovationHubService: { getInnovationHubOrFail: Mock };
  let storageAggregatorService: { getStorageAggregatorOrFail: Mock };
  let storageBucketService: { getStorageBucketOrFail: Mock };
  let applicationService: { getApplicationOrFail: Mock };
  let invitationService: { getInvitationOrFail: Mock };
  let platformInvitationService: { getPlatformInvitationOrFail: Mock };
  let virtualContributorService: {
    getVirtualContributorByIdOrFail: Mock;
  };
  let innovationFlowService: { getInnovationFlowOrFail: Mock };
  let whiteboardService: { getWhiteboardOrFail: Mock };
  let memoService: { getMemoOrFail: Mock };
  let guidelinesService: { getCommunityGuidelinesOrFail: Mock };
  let spaceAboutService: { getSpaceAboutOrFail: Mock };
  let knowledgeBaseService: { getKnowledgeBaseOrFail: Mock };
  let conversationService: { getConversationOrFail: Mock };
  let templateContentSpaceService: {
    getTemplateContentSpaceOrFail: Mock;
  };

  const actorContext = { actorID: 'actor-1', credentials: [] } as any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [LookupResolverFields, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(LookupResolverFields);
    authorizationService = module.get(AuthorizationService) as any;
    spaceService = module.get(SpaceService) as any;
    accountService = module.get(AccountService) as any;
    organizationLookupService = module.get(OrganizationLookupService) as any;
    userLookupService = module.get(UserLookupService) as any;
    profileService = module.get(ProfileService) as any;
    calloutService = module.get(CalloutService) as any;
    contributionService = module.get(CalloutContributionService) as any;
    postService = module.get(PostService) as any;
    roomService = module.get(RoomService) as any;
    calendarEventService = module.get(CalendarEventService) as any;
    calendarService = module.get(CalendarService) as any;
    documentService = module.get(DocumentService) as any;
    templateService = module.get(TemplateService) as any;
    templatesSetService = module.get(TemplatesSetService) as any;
    templatesManagerService = module.get(TemplatesManagerService) as any;
    communityService = module.get(CommunityService) as any;
    collaborationService = module.get(CollaborationService) as any;
    roleSetService = module.get(RoleSetService) as any;
    licenseService = module.get(LicenseService) as any;
    innovationPackService = module.get(InnovationPackService) as any;
    innovationHubService = module.get(InnovationHubService) as any;
    storageAggregatorService = module.get(StorageAggregatorService) as any;
    storageBucketService = module.get(StorageBucketService) as any;
    applicationService = module.get(ApplicationService) as any;
    invitationService = module.get(InvitationService) as any;
    platformInvitationService = module.get(PlatformInvitationService) as any;
    virtualContributorService = module.get(VirtualContributorService) as any;
    innovationFlowService = module.get(InnovationFlowService) as any;
    whiteboardService = module.get(WhiteboardService) as any;
    memoService = module.get(MemoService) as any;
    guidelinesService = module.get(CommunityGuidelinesService) as any;
    spaceAboutService = module.get(SpaceAboutService) as any;
    knowledgeBaseService = module.get(KnowledgeBaseService) as any;
    conversationService = module.get(ConversationService) as any;
    templateContentSpaceService = module.get(
      TemplateContentSpaceService
    ) as any;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  const createEntityWithAuth = (id: string) => ({
    id,
    authorization: { id: `auth-${id}` },
  });

  describe('space', () => {
    it('should lookup space and check authorization', async () => {
      const space = createEntityWithAuth('space-1');
      spaceService.getSpaceOrFail.mockResolvedValue(space);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.space(actorContext, 'space-1');
      expect(result).toBe(space);
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        space.authorization,
        AuthorizationPrivilege.READ_ABOUT,
        expect.any(String)
      );
    });
  });

  describe('account', () => {
    it('should lookup account and check authorization', async () => {
      const account = createEntityWithAuth('account-1');
      accountService.getAccountOrFail.mockResolvedValue(account);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.account(actorContext, 'account-1');
      expect(result).toBe(account);
    });
  });

  describe('conversation', () => {
    it('should lookup conversation and check authorization', async () => {
      const conversation = createEntityWithAuth('conv-1');
      conversationService.getConversationOrFail.mockResolvedValue(conversation);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.conversation(actorContext, 'conv-1');
      expect(result).toBe(conversation);
    });
  });

  describe('organization', () => {
    it('should lookup organization without auth check', async () => {
      const org = { id: 'org-1' };
      organizationLookupService.getOrganizationByIdOrFail.mockResolvedValue(
        org
      );

      const result = await resolver.organization('org-1');
      expect(result).toBe(org);
    });
  });

  describe('myPrivileges', () => {
    it('should return an empty object', () => {
      const result = resolver.myPrivileges();
      expect(result).toBeDefined();
    });
  });

  describe('roleSet', () => {
    it('should lookup roleSet without auth check', async () => {
      const roleSet = { id: 'rs-1' };
      roleSetService.getRoleSetOrFail.mockResolvedValue(roleSet);

      const result = await resolver.roleSet('rs-1');
      expect(result).toBe(roleSet);
    });
  });

  describe('document', () => {
    it('should lookup document and check authorization', async () => {
      const doc = createEntityWithAuth('doc-1');
      documentService.getDocumentOrFail.mockResolvedValue(doc);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.document(actorContext, 'doc-1');
      expect(result).toBe(doc);
    });
  });

  describe('virtualContributor', () => {
    it('should lookup VC and check authorization', async () => {
      const vc = createEntityWithAuth('vc-1');
      virtualContributorService.getVirtualContributorByIdOrFail.mockResolvedValue(
        vc
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.virtualContributor(actorContext, 'vc-1');
      expect(result).toBe(vc);
    });
  });

  describe('user', () => {
    it('should lookup user and check authorization', async () => {
      const user = createEntityWithAuth('user-1');
      userLookupService.getUserByIdOrFail.mockResolvedValue(user);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.user(actorContext, 'user-1');
      expect(result).toBe(user);
    });
  });

  describe('profile', () => {
    it('should lookup profile and check authorization', async () => {
      const profile = createEntityWithAuth('profile-1');
      profileService.getProfileOrFail.mockResolvedValue(profile);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.profile(actorContext, 'profile-1');
      expect(result).toBe(profile);
    });
  });

  describe('callout', () => {
    it('should lookup callout and check authorization', async () => {
      const callout = createEntityWithAuth('callout-1');
      calloutService.getCalloutOrFail.mockResolvedValue(callout);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.callout(actorContext, 'callout-1');
      expect(result).toBe(callout);
    });
  });

  describe('contribution', () => {
    it('should lookup contribution and check authorization', async () => {
      const contribution = createEntityWithAuth('contrib-1');
      contributionService.getCalloutContributionOrFail.mockResolvedValue(
        contribution
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.contribution(actorContext, 'contrib-1');
      expect(result).toBe(contribution);
    });
  });

  describe('post', () => {
    it('should lookup post and check authorization', async () => {
      const post = createEntityWithAuth('post-1');
      postService.getPostOrFail.mockResolvedValue(post);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.post(actorContext, 'post-1');
      expect(result).toBe(post);
    });
  });

  describe('room', () => {
    it('should lookup room and check authorization', async () => {
      const room = createEntityWithAuth('room-1');
      roomService.getRoomOrFail.mockResolvedValue(room);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.room(actorContext, 'room-1');
      expect(result).toBe(room);
    });
  });

  describe('innovationFlow', () => {
    it('should lookup innovation flow and check authorization', async () => {
      const flow = createEntityWithAuth('flow-1');
      innovationFlowService.getInnovationFlowOrFail.mockResolvedValue(flow);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.innovationFlow(actorContext, 'flow-1');
      expect(result).toBe(flow);
    });
  });

  describe('calendarEvent', () => {
    it('should lookup calendar event and check authorization', async () => {
      const event = createEntityWithAuth('evt-1');
      calendarEventService.getCalendarEventOrFail.mockResolvedValue(event);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.calendarEvent(actorContext, 'evt-1');
      expect(result).toBe(event);
    });
  });

  describe('calloutsSet', () => {
    it('should lookup calloutsSet and check authorization', async () => {
      const cs = createEntityWithAuth('cs-1');
      const _calloutsSetService = { getCalloutsSetOrFail: vi.fn() } as any;
      // Re-get from module
      const csService = resolver['calloutsSetService'] as any;
      csService.getCalloutsSetOrFail.mockResolvedValue(cs);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.calloutsSet(actorContext, 'cs-1');
      expect(result).toBe(cs);
    });
  });

  describe('calendar', () => {
    it('should lookup calendar and check authorization', async () => {
      const cal = createEntityWithAuth('cal-1');
      calendarService.getCalendarOrFail.mockResolvedValue(cal);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.calendar(actorContext, 'cal-1');
      expect(result).toBe(cal);
    });
  });

  describe('about', () => {
    it('should lookup spaceAbout and check authorization', async () => {
      const about = createEntityWithAuth('about-1');
      spaceAboutService.getSpaceAboutOrFail.mockResolvedValue(about);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.about(actorContext, 'about-1');
      expect(result).toBe(about);
    });
  });

  describe('whiteboard', () => {
    it('should lookup whiteboard and check authorization', async () => {
      const wb = createEntityWithAuth('wb-1');
      whiteboardService.getWhiteboardOrFail.mockResolvedValue(wb);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.whiteboard(actorContext, 'wb-1');
      expect(result).toBe(wb);
    });
  });

  describe('memo', () => {
    it('should lookup memo and check authorization', async () => {
      const memo = createEntityWithAuth('memo-1');
      memoService.getMemoOrFail.mockResolvedValue(memo);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.memo(actorContext, 'memo-1');
      expect(result).toBe(memo);
    });
  });

  describe('template', () => {
    it('should lookup template and check authorization', async () => {
      const tmpl = createEntityWithAuth('tmpl-1');
      templateService.getTemplateOrFail.mockResolvedValue(tmpl);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.template(actorContext, 'tmpl-1');
      expect(result).toBe(tmpl);
    });
  });

  describe('templateContentSpace', () => {
    it('should lookup template content space and check authorization', async () => {
      const tcs = createEntityWithAuth('tcs-1');
      templateContentSpaceService.getTemplateContentSpaceOrFail.mockResolvedValue(
        tcs
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.templateContentSpace(actorContext, 'tcs-1');
      expect(result).toBe(tcs);
    });
  });

  describe('templatesSet', () => {
    it('should lookup templates set and check authorization', async () => {
      const ts = createEntityWithAuth('ts-1');
      templatesSetService.getTemplatesSetOrFail.mockResolvedValue(ts);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.templatesSet(actorContext, 'ts-1');
      expect(result).toBe(ts);
    });
  });

  describe('templatesManager', () => {
    it('should lookup templates manager and check authorization', async () => {
      const tm = createEntityWithAuth('tm-1');
      templatesManagerService.getTemplatesManagerOrFail.mockResolvedValue(tm);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.templatesManager(actorContext, 'tm-1');
      expect(result).toBe(tm);
    });
  });

  describe('communityGuidelines', () => {
    it('should lookup community guidelines and check authorization', async () => {
      const cg = createEntityWithAuth('cg-1');
      guidelinesService.getCommunityGuidelinesOrFail.mockResolvedValue(cg);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.communityGuidelines(actorContext, 'cg-1');
      expect(result).toBe(cg);
    });
  });

  describe('license', () => {
    it('should lookup license without auth check', async () => {
      const lic = { id: 'lic-1' };
      licenseService.getLicenseOrFail.mockResolvedValue(lic);

      const result = await resolver.license('lic-1');
      expect(result).toBe(lic);
    });
  });

  describe('knowledgeBase', () => {
    it('should lookup knowledge base and check authorization', async () => {
      const kb = createEntityWithAuth('kb-1');
      knowledgeBaseService.getKnowledgeBaseOrFail.mockResolvedValue(kb);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.knowledgeBase(actorContext, 'kb-1');
      expect(result).toBe(kb);
    });
  });

  describe('innovationPack', () => {
    it('should lookup innovation pack and check authorization', async () => {
      const pack = createEntityWithAuth('pack-1');
      innovationPackService.getInnovationPackOrFail.mockResolvedValue(pack);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.innovationPack(actorContext, 'pack-1');
      expect(result).toBe(pack);
    });
  });

  describe('innovationHub', () => {
    it('should lookup innovation hub and check authorization', async () => {
      const hub = createEntityWithAuth('hub-1');
      innovationHubService.getInnovationHubOrFail.mockResolvedValue(hub);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.innovationHub(actorContext, 'hub-1');
      expect(result).toBe(hub);
    });
  });

  describe('storageAggregator', () => {
    it('should lookup storage aggregator and check authorization', async () => {
      const sa = createEntityWithAuth('sa-1');
      storageAggregatorService.getStorageAggregatorOrFail.mockResolvedValue(sa);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.storageAggregator(actorContext, 'sa-1');
      expect(result).toBe(sa);
    });
  });

  describe('storageBucket', () => {
    it('should lookup storage bucket and check authorization', async () => {
      const sb = createEntityWithAuth('sb-1');
      storageBucketService.getStorageBucketOrFail.mockResolvedValue(sb);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.storageBucket(actorContext, 'sb-1');
      expect(result).toBe(sb);
    });
  });

  describe('application', () => {
    it('should lookup application and check authorization', async () => {
      const app = createEntityWithAuth('app-1');
      applicationService.getApplicationOrFail.mockResolvedValue(app);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.application(actorContext, 'app-1');
      expect(result).toBe(app);
    });
  });

  describe('invitation', () => {
    it('should lookup invitation and check authorization', async () => {
      const inv = createEntityWithAuth('inv-1');
      invitationService.getInvitationOrFail.mockResolvedValue(inv);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.invitation(actorContext, 'inv-1');
      expect(result).toBe(inv);
    });
  });

  describe('platformInvitation', () => {
    it('should lookup platform invitation and check authorization', async () => {
      const pi = createEntityWithAuth('pi-1');
      platformInvitationService.getPlatformInvitationOrFail.mockResolvedValue(
        pi
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.platformInvitation(actorContext, 'pi-1');
      expect(result).toBe(pi);
    });
  });

  describe('community', () => {
    it('should lookup community without auth check', async () => {
      const community = { id: 'comm-1' };
      communityService.getCommunityOrFail.mockResolvedValue(community);

      const result = await resolver.community('comm-1');
      expect(result).toBe(community);
    });
  });

  describe('collaboration', () => {
    it('should lookup collaboration', async () => {
      const collab = { id: 'collab-1' };
      collaborationService.getCollaborationOrFail.mockResolvedValue(collab);

      const result = await resolver.collaboration(actorContext, 'collab-1');
      expect(result).toBe(collab);
    });
  });

  describe('authorizationPolicy', () => {
    it('should lookup authorization policy with platform admin check', async () => {
      const authPolicy = { id: 'ap-1' };
      const platformAuth = { id: 'platform-auth' };
      const apService = resolver['authorizationPolicyService'] as any;
      apService.getAuthorizationPolicyOrFail.mockResolvedValue(authPolicy);
      const platformService = resolver['platformAuthorizationService'] as any;
      platformService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformAuth
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.authorizationPolicy(actorContext, 'ap-1');
      expect(result).toBe(authPolicy);
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        platformAuth,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        expect.any(String)
      );
    });
  });

  describe('authorizationPrivilegesForUser', () => {
    it('should return granted privileges for a user', async () => {
      const platformAuth = { id: 'platform-auth' };
      const authorization = { id: 'auth-1' };
      const user = { id: 'user-1', credentials: [{ id: 'cred-1' }] };
      const platformService = resolver['platformAuthorizationService'] as any;
      platformService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformAuth
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      const apService = resolver['authorizationPolicyService'] as any;
      apService.getAuthorizationPolicyOrFail.mockResolvedValue(authorization);
      userLookupService.getUserByIdOrFail.mockResolvedValue(user);
      (authorizationService as any).getGrantedPrivileges.mockReturnValue([
        AuthorizationPrivilege.READ,
      ]);

      const result = await resolver.authorizationPrivilegesForUser(
        actorContext,
        'user-1',
        'auth-1'
      );
      expect(result).toEqual([AuthorizationPrivilege.READ]);
    });
  });
});
