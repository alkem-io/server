import { AuthorizationCredential } from '@common/enums';
import { NotificationEvent } from '@common/enums/notification.event';
import { ValidationException } from '@common/exceptions';
import { NotificationEventException } from '@common/exceptions/notification.event.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { NotificationRecipientsService } from './notification.recipients.service';

describe('NotificationRecipientsService', () => {
  let service: NotificationRecipientsService;
  let userLookupService: UserLookupService;
  let virtualContributorLookupService: VirtualContributorLookupService;
  let spaceLookupService: SpaceLookupService;
  let organizationLookupService: OrganizationLookupService;
  let authorizationService: AuthorizationService;
  let platformAuthorizationService: PlatformAuthorizationPolicyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationRecipientsService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(NotificationRecipientsService);
    userLookupService = module.get(UserLookupService);
    virtualContributorLookupService = module.get(
      VirtualContributorLookupService
    );
    spaceLookupService = module.get(SpaceLookupService);
    organizationLookupService = module.get(OrganizationLookupService);
    authorizationService = module.get(AuthorizationService);
    platformAuthorizationService = module.get(
      PlatformAuthorizationPolicyService
    );

    // Default mocks to prevent proxy objects in template literals
    vi.mocked(userLookupService.getUsersByUUID).mockResolvedValue([]);
    vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([]);
  });

  describe('getRecipients', () => {
    it('should return email and inApp recipients for PLATFORM_FORUM_DISCUSSION_CREATED', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        settings: {
          notification: {
            platform: {
              forumDiscussionCreated: { email: true, inApp: true },
              forumDiscussionComment: { email: false, inApp: false },
              admin: {
                userProfileCreated: { email: false, inApp: false },
                userProfileRemoved: { email: false, inApp: false },
                spaceCreated: { email: false, inApp: false },
                userGlobalRoleChanged: { email: false, inApp: false },
              },
            },
            organization: {
              adminMessageReceived: { email: false, inApp: false },
              adminMentioned: { email: false, inApp: false },
            },
            user: {
              membership: {
                spaceCommunityInvitationReceived: {
                  email: false,
                  inApp: false,
                },
                spaceCommunityJoined: { email: false, inApp: false },
              },
              commentReply: { email: false, inApp: false },
              mentioned: { email: false, inApp: false },
              messageReceived: { email: false, inApp: false },
            },
            space: {
              admin: {
                communityApplicationReceived: { email: false, inApp: false },
                communicationMessageReceived: { email: false, inApp: false },
                communityNewMember: { email: false, inApp: false },
                collaborationCalloutContributionCreated: {
                  email: false,
                  inApp: false,
                },
              },
              communicationUpdates: { email: false, inApp: false },
              collaborationCalloutContributionCreated: {
                email: false,
                inApp: false,
              },
              collaborationCalloutPostContributionComment: {
                email: false,
                inApp: false,
              },
              collaborationCalloutComment: { email: false, inApp: false },
              collaborationCalloutPublished: { email: false, inApp: false },
              communityCalendarEvents: { email: false, inApp: false },
            },
            virtualContributor: {
              adminSpaceCommunityInvitation: { email: false, inApp: false },
            },
          },
        },
        agent: { credentials: [{ type: 'test' }] },
      } as unknown as IUser;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        mockUser,
      ]);
      vi.mocked(userLookupService.getUsersByUUID).mockResolvedValue([mockUser]);

      const result = await service.getRecipients({
        eventType: NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED,
      });

      expect(result.emailRecipients).toHaveLength(1);
      expect(result.inAppRecipients).toHaveLength(1);
      expect(result.triggeredBy).toBeUndefined();
    });

    it('should resolve triggeredBy user when provided', async () => {
      const triggeredByUser = {
        id: 'trigger-user',
        email: 'trigger@example.com',
      } as unknown as IUser;

      vi.mocked(userLookupService.getUserOrFail).mockResolvedValue(
        triggeredByUser
      );

      const result = await service.getRecipients({
        eventType: NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED,
        triggeredBy: 'trigger-user',
      });

      expect(result.triggeredBy).toBe(triggeredByUser);
    });

    it('should filter recipients without notification enabled', async () => {
      const userWithNotifOff = {
        id: 'user-off',
        email: 'off@example.com',
        settings: {
          notification: {
            platform: {
              forumDiscussionCreated: { email: false, inApp: false },
            },
          },
        },
      } as unknown as IUser;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        userWithNotifOff,
      ]);

      const result = await service.getRecipients({
        eventType: NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED,
      });

      expect(result.emailRecipients).toHaveLength(0);
      expect(result.inAppRecipients).toHaveLength(0);
    });

    it('should filter recipients based on privilege for PLATFORM_ADMIN events', async () => {
      const adminUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        settings: {
          notification: {
            platform: {
              admin: {
                userProfileCreated: { email: true, inApp: true },
              },
            },
          },
        },
        agent: {
          credentials: [
            { type: AuthorizationCredential.GLOBAL_ADMIN, resourceID: '' },
          ],
        },
      } as unknown as IUser;

      const platformAuthPolicy = { id: 'platform-auth' } as any;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        adminUser,
      ]);
      vi.mocked(userLookupService.getUsersByUUID).mockResolvedValue([
        adminUser,
      ]);
      vi.mocked(
        platformAuthorizationService.getPlatformAuthorizationPolicy
      ).mockResolvedValue(platformAuthPolicy);
      vi.mocked(
        authorizationService.isAccessGrantedForCredentials
      ).mockReturnValue(true);

      const result = await service.getRecipients({
        eventType: NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_CREATED,
      });

      expect(result.emailRecipients).toHaveLength(1);
      expect(
        authorizationService.isAccessGrantedForCredentials
      ).toHaveBeenCalled();
    });

    it('should exclude recipients who lack required privilege', async () => {
      const userNoPriv = {
        id: 'no-priv-user',
        email: 'nopriv@example.com',
        settings: {
          notification: {
            platform: {
              admin: {
                userProfileCreated: { email: true, inApp: true },
              },
            },
          },
        },
        agent: {
          credentials: [{ type: 'some-credential', resourceID: '' }],
        },
      } as unknown as IUser;

      const platformAuthPolicy = { id: 'platform-auth' } as any;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        userNoPriv,
      ]);
      vi.mocked(userLookupService.getUsersByUUID).mockResolvedValue([
        userNoPriv,
      ]);
      vi.mocked(
        platformAuthorizationService.getPlatformAuthorizationPolicy
      ).mockResolvedValue(platformAuthPolicy);
      vi.mocked(
        authorizationService.isAccessGrantedForCredentials
      ).mockReturnValue(false);

      const result = await service.getRecipients({
        eventType: NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_CREATED,
      });

      expect(result.emailRecipients).toHaveLength(0);
      expect(result.inAppRecipients).toHaveLength(0);
    });
  });

  describe('getRecipients - credential criteria selection', () => {
    beforeEach(() => {
      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([]);
    });

    it('should use GLOBAL_REGISTERED credential for PLATFORM_FORUM_DISCUSSION_CREATED', async () => {
      await service.getRecipients({
        eventType: NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED,
      });

      expect(userLookupService.usersWithCredentials).toHaveBeenCalledWith(
        [
          {
            type: AuthorizationCredential.GLOBAL_REGISTERED,
            resourceID: '',
          },
        ],
        undefined,
        expect.any(Object)
      );
    });

    it('should use global admin criteria for PLATFORM_ADMIN_SPACE_CREATED', async () => {
      await service.getRecipients({
        eventType: NotificationEvent.PLATFORM_ADMIN_SPACE_CREATED,
      });

      expect(userLookupService.usersWithCredentials).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: AuthorizationCredential.GLOBAL_ADMIN,
          }),
          expect.objectContaining({
            type: AuthorizationCredential.GLOBAL_SUPPORT,
          }),
          expect.objectContaining({
            type: AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
          }),
        ]),
        undefined,
        expect.any(Object)
      );
    });

    it('should use ORGANIZATION_ASSOCIATE for ORGANIZATION_ADMIN_MESSAGE', async () => {
      await service.getRecipients({
        eventType: NotificationEvent.ORGANIZATION_ADMIN_MESSAGE,
        organizationID: 'org-1',
      });

      expect(userLookupService.usersWithCredentials).toHaveBeenCalledWith(
        [
          {
            type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
            resourceID: 'org-1',
          },
        ],
        undefined,
        expect.any(Object)
      );
    });

    it('should throw ValidationException for ORGANIZATION_ADMIN_MESSAGE without organizationID', async () => {
      await expect(
        service.getRecipients({
          eventType: NotificationEvent.ORGANIZATION_ADMIN_MESSAGE,
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should use SPACE_ADMIN for SPACE_ADMIN_COMMUNITY_APPLICATION', async () => {
      await service.getRecipients({
        eventType: NotificationEvent.SPACE_ADMIN_COMMUNITY_APPLICATION,
        spaceID: 'space-1',
      });

      expect(userLookupService.usersWithCredentials).toHaveBeenCalledWith(
        [
          {
            type: AuthorizationCredential.SPACE_ADMIN,
            resourceID: 'space-1',
          },
        ],
        undefined,
        expect.any(Object)
      );
    });

    it('should throw ValidationException for SPACE_ADMIN_COMMUNITY_APPLICATION without spaceID', async () => {
      await expect(
        service.getRecipients({
          eventType: NotificationEvent.SPACE_ADMIN_COMMUNITY_APPLICATION,
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should use SPACE_LEAD for SPACE_LEAD_COMMUNICATION_MESSAGE', async () => {
      await service.getRecipients({
        eventType: NotificationEvent.SPACE_LEAD_COMMUNICATION_MESSAGE,
        spaceID: 'space-1',
      });

      expect(userLookupService.usersWithCredentials).toHaveBeenCalledWith(
        [
          {
            type: AuthorizationCredential.SPACE_LEAD,
            resourceID: 'space-1',
          },
        ],
        undefined,
        expect.any(Object)
      );
    });

    it('should use SPACE_MEMBER for SPACE_COMMUNICATION_UPDATE', async () => {
      await service.getRecipients({
        eventType: NotificationEvent.SPACE_COMMUNICATION_UPDATE,
        spaceID: 'space-1',
      });

      expect(userLookupService.usersWithCredentials).toHaveBeenCalledWith(
        [
          {
            type: AuthorizationCredential.SPACE_MEMBER,
            resourceID: 'space-1',
          },
        ],
        undefined,
        expect.any(Object)
      );
    });

    it('should use USER_SELF_MANAGEMENT for USER_MENTIONED', async () => {
      await service.getRecipients({
        eventType: NotificationEvent.USER_MENTIONED,
        userID: 'user-1',
      });

      expect(userLookupService.usersWithCredentials).toHaveBeenCalledWith(
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: 'user-1',
          },
        ],
        undefined,
        expect.any(Object)
      );
    });

    it('should throw ValidationException for USER_MENTIONED without userID', async () => {
      await expect(
        service.getRecipients({
          eventType: NotificationEvent.USER_MENTIONED,
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should use ACCOUNT_ADMIN for VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION', async () => {
      vi.mocked(
        virtualContributorLookupService.getVirtualContributorOrFail
      ).mockResolvedValue({
        id: 'vc-1',
        account: { id: 'account-1' },
      } as any);

      await service.getRecipients({
        eventType:
          NotificationEvent.VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION,
        virtualContributorID: 'vc-1',
      });

      expect(userLookupService.usersWithCredentials).toHaveBeenCalledWith(
        [
          {
            type: AuthorizationCredential.ACCOUNT_ADMIN,
            resourceID: 'account-1',
          },
        ],
        undefined,
        expect.any(Object)
      );
    });

    it('should throw ValidationException for VIRTUAL_CONTRIBUTOR_ADMIN without virtualContributorID', async () => {
      await expect(
        service.getRecipients({
          eventType:
            NotificationEvent.VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION,
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should throw NotificationEventException for unknown event type', async () => {
      await expect(
        service.getRecipients({
          eventType: 'UNKNOWN_EVENT' as NotificationEvent,
        })
      ).rejects.toThrow(NotificationEventException);
    });
  });

  describe('getRecipients - channel settings for events', () => {
    it('should return fixed email:true, inApp:true for USER_SIGN_UP_WELCOME', async () => {
      const userWithSettings = {
        id: 'user-welcome',
        email: 'welcome@example.com',
        settings: {
          notification: {
            // The settings object exists but the fixed values override
            user: {
              membership: {
                spaceCommunityInvitationReceived: {
                  email: false,
                  inApp: false,
                },
                spaceCommunityJoined: { email: false, inApp: false },
              },
              commentReply: { email: false, inApp: false },
              mentioned: { email: false, inApp: false },
              messageReceived: { email: false, inApp: false },
            },
          },
        },
        agent: { credentials: [] },
      } as unknown as IUser;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        userWithSettings,
      ]);
      vi.mocked(userLookupService.getUsersByUUID).mockResolvedValue([
        userWithSettings,
      ]);

      const result = await service.getRecipients({
        eventType: NotificationEvent.USER_SIGN_UP_WELCOME,
        userID: 'user-welcome',
      });

      // USER_SIGN_UP_WELCOME has fixed { email: true, inApp: true }
      expect(result.emailRecipients).toHaveLength(1);
      expect(result.inAppRecipients).toHaveLength(1);
    });

    it('should return email:true, inApp:false for SPACE_COMMUNITY_INVITATION_USER_PLATFORM', async () => {
      const user = {
        id: 'user-invite',
        email: 'invite@example.com',
        settings: {
          notification: {},
        },
        agent: { credentials: [] },
      } as unknown as IUser;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        user,
      ]);
      // Return the user only when called with matching IDs, empty otherwise
      vi.mocked(userLookupService.getUsersByUUID).mockImplementation(
        async (ids: string[]) => (ids.length > 0 ? [user] : [])
      );

      const result = await service.getRecipients({
        eventType: NotificationEvent.SPACE_COMMUNITY_INVITATION_USER_PLATFORM,
        userID: 'user-invite',
      });

      // Fixed { email: true, inApp: false }
      expect(result.emailRecipients).toHaveLength(1);
      expect(result.inAppRecipients).toHaveLength(0);
    });
  });

  describe('getRecipients - authorization policy retrieval', () => {
    it('should retrieve organization authorization for ORGANIZATION_ADMIN_MESSAGE', async () => {
      const orgAuthPolicy = { id: 'org-auth' };
      const mockOrg = {
        id: 'org-1',
        authorization: orgAuthPolicy,
      } as any;
      const adminUser = {
        id: 'admin-1',
        email: 'admin@org.com',
        settings: {
          notification: {
            organization: {
              adminMessageReceived: { email: true, inApp: false },
            },
          },
        },
        agent: {
          credentials: [
            {
              type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
              resourceID: 'org-1',
            },
          ],
        },
      } as unknown as IUser;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        adminUser,
      ]);
      vi.mocked(userLookupService.getUsersByUUID).mockResolvedValue([
        adminUser,
      ]);
      vi.mocked(
        organizationLookupService.getOrganizationOrFail
      ).mockResolvedValue(mockOrg);
      vi.mocked(
        authorizationService.isAccessGrantedForCredentials
      ).mockReturnValue(true);

      const result = await service.getRecipients({
        eventType: NotificationEvent.ORGANIZATION_ADMIN_MESSAGE,
        organizationID: 'org-1',
      });

      expect(
        organizationLookupService.getOrganizationOrFail
      ).toHaveBeenCalledWith('org-1');
      expect(result.emailRecipients).toHaveLength(1);
    });

    it('should retrieve space authorization for SPACE_COMMUNICATION_UPDATE', async () => {
      const spaceAuthPolicy = { id: 'space-auth' };
      const mockSpace = {
        id: 'space-1',
        authorization: spaceAuthPolicy,
      } as any;
      const memberUser = {
        id: 'member-1',
        email: 'member@space.com',
        settings: {
          notification: {
            space: {
              communicationUpdates: { email: true, inApp: false },
            },
          },
        },
        agent: {
          credentials: [
            {
              type: AuthorizationCredential.SPACE_MEMBER,
              resourceID: 'space-1',
            },
          ],
        },
      } as unknown as IUser;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        memberUser,
      ]);
      vi.mocked(userLookupService.getUsersByUUID).mockResolvedValue([
        memberUser,
      ]);
      vi.mocked(spaceLookupService.getSpaceOrFail).mockResolvedValue(mockSpace);
      vi.mocked(
        authorizationService.isAccessGrantedForCredentials
      ).mockReturnValue(true);

      const result = await service.getRecipients({
        eventType: NotificationEvent.SPACE_COMMUNICATION_UPDATE,
        spaceID: 'space-1',
      });

      expect(spaceLookupService.getSpaceOrFail).toHaveBeenCalledWith('space-1');
      expect(result.emailRecipients).toHaveLength(1);
    });

    it('should throw ValidationException when space event has no spaceID for auth policy', async () => {
      const memberUser = {
        id: 'member-1',
        email: 'member@space.com',
        settings: {
          notification: {
            space: {
              communicationUpdates: { email: true, inApp: false },
            },
          },
        },
        agent: {
          credentials: [
            {
              type: AuthorizationCredential.SPACE_MEMBER,
              resourceID: 'space-1',
            },
          ],
        },
      } as unknown as IUser;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        memberUser,
      ]);
      vi.mocked(userLookupService.getUsersByUUID).mockResolvedValue([
        memberUser,
      ]);

      await expect(
        service.getRecipients({
          eventType: NotificationEvent.SPACE_COMMUNICATION_UPDATE,
          // no spaceID provided
        })
      ).rejects.toThrow(ValidationException);
    });
  });
});
