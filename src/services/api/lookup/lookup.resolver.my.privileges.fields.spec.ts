import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RelationshipNotFoundException } from '@common/exceptions';
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
import { WhiteboardService } from '@domain/common/whiteboard';
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
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { LookupMyPrivilegesResolverFields } from './lookup.resolver.my.privileges.fields';

describe('LookupMyPrivilegesResolverFields', () => {
  let resolver: LookupMyPrivilegesResolverFields;
  let authorizationPolicyService: { getAgentPrivileges: Mock };
  let spaceService: { getSpace: Mock };
  let accountService: { getAccountOrFail: Mock };
  let roleSetService: { getRoleSetOrFail: Mock };
  let documentService: { getDocumentOrFail: Mock };
  let virtualContributorService: {
    getVirtualContributorByIdOrFail: Mock;
  };
  let userLookupService: { getUserByIdOrFail: Mock };
  let storageAggregatorService: { getStorageAggregatorOrFail: Mock };
  let innovationPackService: { getInnovationPackOrFail: Mock };
  let storageBucketService: { getStorageBucketOrFail: Mock };
  let innovationHubService: { getInnovationHubOrFail: Mock };
  let applicationService: { getApplicationOrFail: Mock };
  let invitationService: { getInvitationOrFail: Mock };
  let communityService: { getCommunityOrFail: Mock };
  let collaborationService: { getCollaborationOrFail: Mock };
  let calendarEventService: { getCalendarEventOrFail: Mock };
  let calendarService: { getCalendarOrFail: Mock };
  let spaceAboutService: { getSpaceAboutOrFail: Mock };
  let whiteboardService: { getWhiteboardOrFail: Mock };
  let profileService: { getProfileOrFail: Mock };
  let calloutService: { getCalloutOrFail: Mock };
  let postService: { getPostOrFail: Mock };
  let roomService: { getRoomOrFail: Mock };
  let innovationFlowService: { getInnovationFlowOrFail: Mock };
  let templateService: { getTemplateOrFail: Mock };
  let templatesSetService: { getTemplatesSetOrFail: Mock };
  let templatesManagerService: { getTemplatesManagerOrFail: Mock };
  let guidelinesService: { getCommunityGuidelinesOrFail: Mock };
  let licenseService: { getLicenseOrFail: Mock };

  const actorContext = { actorID: 'actor-1', credentials: [] } as any;
  const mockPrivileges = [AuthorizationPrivilege.READ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LookupMyPrivilegesResolverFields, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(LookupMyPrivilegesResolverFields);
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    spaceService = module.get(SpaceService) as any;
    accountService = module.get(AccountService) as any;
    roleSetService = module.get(RoleSetService) as any;
    documentService = module.get(DocumentService) as any;
    virtualContributorService = module.get(VirtualContributorService) as any;
    userLookupService = module.get(UserLookupService) as any;
    storageAggregatorService = module.get(StorageAggregatorService) as any;
    innovationPackService = module.get(InnovationPackService) as any;
    storageBucketService = module.get(StorageBucketService) as any;
    innovationHubService = module.get(InnovationHubService) as any;
    applicationService = module.get(ApplicationService) as any;
    invitationService = module.get(InvitationService) as any;
    communityService = module.get(CommunityService) as any;
    collaborationService = module.get(CollaborationService) as any;
    calendarEventService = module.get(CalendarEventService) as any;
    calendarService = module.get(CalendarService) as any;
    spaceAboutService = module.get(SpaceAboutService) as any;
    whiteboardService = module.get(WhiteboardService) as any;
    profileService = module.get(ProfileService) as any;
    calloutService = module.get(CalloutService) as any;
    postService = module.get(PostService) as any;
    roomService = module.get(RoomService) as any;
    innovationFlowService = module.get(InnovationFlowService) as any;
    templateService = module.get(TemplateService) as any;
    templatesSetService = module.get(TemplatesSetService) as any;
    templatesManagerService = module.get(TemplatesManagerService) as any;
    guidelinesService = module.get(CommunityGuidelinesService) as any;
    licenseService = module.get(LicenseService) as any;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  const createEntityWithAuth = (id: string) => ({
    id,
    authorization: { id: `auth-${id}` },
    constructor: { name: 'TestEntity' },
  });

  const setupPrivilegesReturn = () => {
    authorizationPolicyService.getAgentPrivileges.mockReturnValue(
      mockPrivileges
    );
  };

  describe('space', () => {
    it('should return empty array when space is not found', async () => {
      spaceService.getSpace = vi.fn().mockResolvedValue(null);

      const result = await resolver.space(actorContext, 'space-1');
      expect(result).toEqual([]);
    });

    it('should return privileges when space is found', async () => {
      const space = createEntityWithAuth('space-1');
      spaceService.getSpace = vi.fn().mockResolvedValue(space);
      setupPrivilegesReturn();

      const result = await resolver.space(actorContext, 'space-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('account', () => {
    it('should return privileges for account', async () => {
      const account = createEntityWithAuth('account-1');
      accountService.getAccountOrFail.mockResolvedValue(account);
      setupPrivilegesReturn();

      const result = await resolver.account(actorContext, 'account-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('roleSet', () => {
    it('should return privileges for roleSet', async () => {
      const roleSet = createEntityWithAuth('rs-1');
      roleSetService.getRoleSetOrFail.mockResolvedValue(roleSet);
      setupPrivilegesReturn();

      const result = await resolver.roleSet(actorContext, 'rs-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('document', () => {
    it('should return privileges for document', async () => {
      const doc = createEntityWithAuth('doc-1');
      documentService.getDocumentOrFail.mockResolvedValue(doc);
      setupPrivilegesReturn();

      const result = await resolver.document(actorContext, 'doc-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('virtualContributor', () => {
    it('should return privileges for VC', async () => {
      const vc = createEntityWithAuth('vc-1');
      virtualContributorService.getVirtualContributorByIdOrFail.mockResolvedValue(
        vc
      );
      setupPrivilegesReturn();

      const result = await resolver.virtualContributor(actorContext, 'vc-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('user', () => {
    it('should return privileges for user', async () => {
      const user = createEntityWithAuth('user-1');
      userLookupService.getUserByIdOrFail.mockResolvedValue(user);
      setupPrivilegesReturn();

      const result = await resolver.user(actorContext, 'user-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('storageAggregator', () => {
    it('should return privileges for storage aggregator', async () => {
      const sa = createEntityWithAuth('sa-1');
      storageAggregatorService.getStorageAggregatorOrFail.mockResolvedValue(sa);
      setupPrivilegesReturn();

      const result = await resolver.storageAggregator(actorContext, 'sa-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('innovationPack', () => {
    it('should return privileges for innovation pack', async () => {
      const pack = createEntityWithAuth('pack-1');
      innovationPackService.getInnovationPackOrFail.mockResolvedValue(pack);
      setupPrivilegesReturn();

      const result = await resolver.innovationPack(actorContext, 'pack-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('storageBucket', () => {
    it('should return privileges for storage bucket', async () => {
      const sb = createEntityWithAuth('sb-1');
      storageBucketService.getStorageBucketOrFail.mockResolvedValue(sb);
      setupPrivilegesReturn();

      const result = await resolver.storageBucket(actorContext, 'sb-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('innovationHub', () => {
    it('should return privileges for innovation hub', async () => {
      const hub = createEntityWithAuth('hub-1');
      innovationHubService.getInnovationHubOrFail.mockResolvedValue(hub);
      setupPrivilegesReturn();

      const result = await resolver.innovationHub(actorContext, 'hub-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('application', () => {
    it('should return privileges for application', async () => {
      const app = createEntityWithAuth('app-1');
      applicationService.getApplicationOrFail.mockResolvedValue(app);
      setupPrivilegesReturn();

      const result = await resolver.application(actorContext, 'app-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('invitation', () => {
    it('should return privileges for invitation', async () => {
      const inv = createEntityWithAuth('inv-1');
      invitationService.getInvitationOrFail.mockResolvedValue(inv);
      setupPrivilegesReturn();

      const result = await resolver.invitation(actorContext, 'inv-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('community', () => {
    it('should return privileges for community', async () => {
      const comm = createEntityWithAuth('comm-1');
      communityService.getCommunityOrFail.mockResolvedValue(comm);
      setupPrivilegesReturn();

      const result = await resolver.community(actorContext, 'comm-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('collaboration', () => {
    it('should return privileges for collaboration', async () => {
      const collab = createEntityWithAuth('collab-1');
      collaborationService.getCollaborationOrFail.mockResolvedValue(collab);
      setupPrivilegesReturn();

      const result = await resolver.collaboration(actorContext, 'collab-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('calendarEvent', () => {
    it('should return privileges for calendar event', async () => {
      const evt = createEntityWithAuth('evt-1');
      calendarEventService.getCalendarEventOrFail.mockResolvedValue(evt);
      setupPrivilegesReturn();

      const result = await resolver.calendarEvent(actorContext, 'evt-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('calendar', () => {
    it('should return privileges for calendar', async () => {
      const cal = createEntityWithAuth('cal-1');
      calendarService.getCalendarOrFail.mockResolvedValue(cal);
      setupPrivilegesReturn();

      const result = await resolver.calendar(actorContext, 'cal-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('spaceAbout', () => {
    it('should return privileges for space about', async () => {
      const about = createEntityWithAuth('about-1');
      spaceAboutService.getSpaceAboutOrFail.mockResolvedValue(about);
      setupPrivilegesReturn();

      const result = await resolver.spaceAbout(actorContext, 'about-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('whiteboard', () => {
    it('should return privileges for whiteboard', async () => {
      const wb = createEntityWithAuth('wb-1');
      whiteboardService.getWhiteboardOrFail.mockResolvedValue(wb);
      setupPrivilegesReturn();

      const result = await resolver.whiteboard(actorContext, 'wb-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('profile', () => {
    it('should return privileges for profile', async () => {
      const profile = createEntityWithAuth('profile-1');
      profileService.getProfileOrFail.mockResolvedValue(profile);
      setupPrivilegesReturn();

      const result = await resolver.profile(actorContext, 'profile-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('callout', () => {
    it('should return privileges for callout', async () => {
      const callout = createEntityWithAuth('callout-1');
      calloutService.getCalloutOrFail.mockResolvedValue(callout);
      setupPrivilegesReturn();

      const result = await resolver.callout(actorContext, 'callout-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('post', () => {
    it('should return privileges for post', async () => {
      const post = createEntityWithAuth('post-1');
      postService.getPostOrFail.mockResolvedValue(post);
      setupPrivilegesReturn();

      const result = await resolver.post(actorContext, 'post-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('room', () => {
    it('should return privileges for room', async () => {
      const room = createEntityWithAuth('room-1');
      roomService.getRoomOrFail.mockResolvedValue(room);
      setupPrivilegesReturn();

      const result = await resolver.room(actorContext, 'room-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('innovationFlow', () => {
    it('should return privileges for innovation flow', async () => {
      const flow = createEntityWithAuth('flow-1');
      innovationFlowService.getInnovationFlowOrFail.mockResolvedValue(flow);
      setupPrivilegesReturn();

      const result = await resolver.innovationFlow(actorContext, 'flow-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('template', () => {
    it('should return privileges for template', async () => {
      const tmpl = createEntityWithAuth('tmpl-1');
      templateService.getTemplateOrFail.mockResolvedValue(tmpl);
      setupPrivilegesReturn();

      const result = await resolver.template(actorContext, 'tmpl-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('templatesSet', () => {
    it('should return privileges for templates set', async () => {
      const ts = createEntityWithAuth('ts-1');
      templatesSetService.getTemplatesSetOrFail.mockResolvedValue(ts);
      setupPrivilegesReturn();

      const result = await resolver.templatesSet(actorContext, 'ts-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('templatesManager', () => {
    it('should return privileges for templates manager', async () => {
      const tm = createEntityWithAuth('tm-1');
      templatesManagerService.getTemplatesManagerOrFail.mockResolvedValue(tm);
      setupPrivilegesReturn();

      const result = await resolver.templatesManager(actorContext, 'tm-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('communityGuidelines', () => {
    it('should return privileges for community guidelines', async () => {
      const cg = createEntityWithAuth('cg-1');
      guidelinesService.getCommunityGuidelinesOrFail.mockResolvedValue(cg);
      setupPrivilegesReturn();

      const result = await resolver.communityGuidelines(actorContext, 'cg-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('license', () => {
    it('should return privileges for license', async () => {
      const lic = createEntityWithAuth('lic-1');
      licenseService.getLicenseOrFail.mockResolvedValue(lic);
      setupPrivilegesReturn();

      const result = await resolver.license(actorContext, 'lic-1');
      expect(result).toEqual(mockPrivileges);
    });
  });

  describe('getMyPrivilegesOnAuthorizable', () => {
    it('should throw RelationshipNotFoundException when authorization is missing', async () => {
      const entityNoAuth = {
        id: 'entity-1',
        constructor: { name: 'TestEntity' },
      };
      spaceService.getSpace = vi.fn().mockResolvedValue(entityNoAuth);

      await expect(resolver.space(actorContext, 'entity-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });
});
