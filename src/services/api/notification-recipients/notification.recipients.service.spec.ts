import { AuthorizationCredential } from '@common/enums';
import { NotificationEvent } from '@common/enums/notification.event';
import { ValidationException } from '@common/exceptions';
import { NotificationEventException } from '@common/exceptions/notification.event.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
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
  let virtualActorLookupService: VirtualActorLookupService;
  let spaceLookupService: SpaceLookupService;
  let organizationLookupService: OrganizationLookupService;
  let authorizationService: AuthorizationService;
  let platformAuthorizationService: PlatformAuthorizationPolicyService;

  beforeEach(async () => {
    vi.restoreAllMocks();

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
    virtualActorLookupService = module.get(VirtualActorLookupService);
    spaceLookupService = module.get(SpaceLookupService);
    organizationLookupService = module.get(OrganizationLookupService);
    authorizationService = module.get(AuthorizationService);
    platformAuthorizationService = module.get(
      PlatformAuthorizationPolicyService
    );

    // Default mocks to prevent proxy objects in template literals
    vi.mocked(userLookupService.getUsersByIds).mockResolvedValue([]);
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
              collaborationPollVoteCastOnOwnPoll: { email: false, inApp: true },
              collaborationPollVoteCastOnPollIVotedOn: {
                email: false,
                inApp: true,
              },
              collaborationPollModifiedOnPollIVotedOn: {
                email: false,
                inApp: true,
              },
              collaborationPollVoteAffectedByOptionChange: {
                email: false,
                inApp: true,
              },
            },
            virtualContributor: {
              adminSpaceCommunityInvitation: { email: false, inApp: false },
            },
          },
        },
        credentials: [{ type: 'test' }],
      } as unknown as IUser;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        mockUser,
      ]);
      vi.mocked(userLookupService.getUsersByIds).mockResolvedValue([mockUser]);

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

      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue(
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
        credentials: [
          { type: AuthorizationCredential.GLOBAL_ADMIN, resourceID: '' },
        ],
      } as unknown as IUser;

      const platformAuthPolicy = { id: 'platform-auth' } as any;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        adminUser,
      ]);
      vi.mocked(userLookupService.getUsersByIds).mockResolvedValue([adminUser]);
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
        credentials: [{ type: 'some-credential', resourceID: '' }],
      } as unknown as IUser;

      const platformAuthPolicy = { id: 'platform-auth' } as any;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        userNoPriv,
      ]);
      vi.mocked(userLookupService.getUsersByIds).mockResolvedValue([
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

    it('should use ACCOUNT_ADMIN for VIRTUAL_ADMIN_SPACE_COMMUNITY_INVITATION', async () => {
      vi.mocked(
        virtualActorLookupService.getVirtualContributorByIdOrFail
      ).mockResolvedValue({
        id: 'vc-1',
        account: { id: 'account-1' },
      } as any);

      await service.getRecipients({
        eventType: NotificationEvent.VIRTUAL_ADMIN_SPACE_COMMUNITY_INVITATION,
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

    it('should throw ValidationException for VIRTUAL_ADMIN without virtualContributorID', async () => {
      await expect(
        service.getRecipients({
          eventType: NotificationEvent.VIRTUAL_ADMIN_SPACE_COMMUNITY_INVITATION,
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

    describe('034-messaging-notifications — plural userIDs (T007)', () => {
      it('resolves USER_CONVERSATION_MESSAGE_DIRECT recipients via ONE OR-combined USER_SELF_MANAGEMENT query', async () => {
        await service.getRecipients({
          eventType: NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT,
          triggeredBy: 'sender-1',
          userIDs: ['user-a'],
        });

        expect(userLookupService.usersWithCredentials).toHaveBeenCalledWith(
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: 'user-a',
            },
          ],
          undefined,
          expect.any(Object)
        );
      });

      it('resolves USER_CONVERSATION_MESSAGE_GROUP recipients — N ids fold into ONE OR-combined query (no N+1)', async () => {
        await service.getRecipients({
          eventType: NotificationEvent.USER_CONVERSATION_MESSAGE_GROUP,
          triggeredBy: 'sender-1',
          userIDs: ['user-a', 'user-b', 'user-c'],
        });

        expect(userLookupService.usersWithCredentials).toHaveBeenCalledTimes(1);
        expect(userLookupService.usersWithCredentials).toHaveBeenCalledWith(
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: 'user-a',
            },
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: 'user-b',
            },
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: 'user-c',
            },
          ],
          undefined,
          expect.any(Object)
        );
      });

      it('throws ValidationException for USER_CONVERSATION_MESSAGE_DIRECT with no userIDs', async () => {
        await expect(
          service.getRecipients({
            eventType: NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT,
            triggeredBy: 'sender-1',
          })
        ).rejects.toThrow(ValidationException);
      });
    });

    describe('callout-reaction notification event (T007/T013)', () => {
      it('uses USER_SELF_MANAGEMENT credential for the callout publisher (not space-audience fanout)', async () => {
        await service.getRecipients({
          eventType: NotificationEvent.SPACE_COLLABORATION_CALLOUT_REACTION,
          userID: 'publisher-id',
        });

        expect(userLookupService.usersWithCredentials).toHaveBeenCalledWith(
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: 'publisher-id',
            },
          ],
          undefined,
          expect.any(Object)
        );
      });

      it('throws ValidationException when userID is missing for callout-reaction event', async () => {
        await expect(
          service.getRecipients({
            eventType: NotificationEvent.SPACE_COLLABORATION_CALLOUT_REACTION,
            // no userID
          })
        ).rejects.toThrow(ValidationException);
      });

      it('inApp channel gating: inApp:false → inAppRecipients empty while mutation succeeds (US2-AS2)', async () => {
        const publisher = {
          id: 'publisher-1',
          email: 'pub@example.com',
          settings: {
            notification: {
              space: {
                collaborationCalloutReaction: {
                  email: false,
                  inApp: false,
                  push: false,
                },
              },
            },
          },
          credentials: [],
        } as unknown as IUser;

        vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
          publisher,
        ]);
        // Return publisher only when ids array is non-empty; otherwise return []
        vi.mocked(userLookupService.getUsersByIds).mockImplementation(
          async (ids: string[]) => (ids.length > 0 ? [publisher] : [])
        );

        const result = await service.getRecipients({
          eventType: NotificationEvent.SPACE_COLLABORATION_CALLOUT_REACTION,
          userID: 'publisher-1',
        });

        expect(result.emailRecipients).toHaveLength(0);
        expect(result.inAppRecipients).toHaveLength(0);
        expect(result.pushRecipients).toHaveLength(0);
      });

      it('push channel: push:true, email:false, inApp:false → only pushRecipients populated (US2 channel matrix)', async () => {
        const publisher = {
          id: 'publisher-1',
          email: 'pub@example.com',
          settings: {
            notification: {
              space: {
                collaborationCalloutReaction: {
                  email: false,
                  inApp: false,
                  push: true,
                },
              },
            },
          },
          credentials: [],
        } as unknown as IUser;

        vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
          publisher,
        ]);
        vi.mocked(userLookupService.getUsersByIds).mockImplementation(
          async (ids: string[]) => (ids.length > 0 ? [publisher] : [])
        );

        const result = await service.getRecipients({
          eventType: NotificationEvent.SPACE_COLLABORATION_CALLOUT_REACTION,
          userID: 'publisher-1',
        });

        expect(result.emailRecipients).toHaveLength(0);
        expect(result.inAppRecipients).toHaveLength(0);
        expect(result.pushRecipients).toHaveLength(1);
      });

      it('defend-on-read: a row without the collaborationCalloutReaction key resolves defaults without throwing (US2-AS4, R-7)', async () => {
        const legacyPublisher = {
          id: 'publisher-legacy',
          email: 'legacy@example.com',
          settings: {
            notification: {
              space: {
                // collaborationCalloutReaction key absent (pre-backfill row)
                collaborationCalloutPublished: {
                  email: true,
                  inApp: true,
                  push: true,
                },
              },
            },
          },
          credentials: [],
        } as unknown as IUser;

        vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
          legacyPublisher,
        ]);
        vi.mocked(userLookupService.getUsersByIds).mockImplementation(
          async (ids: string[]) => (ids.length > 0 ? [legacyPublisher] : [])
        );

        // Should not throw even when the collaborationCalloutReaction key is absent.
        // The service falls back to DEFAULT_CALLOUT_REACTION_CHANNELS = { email: false, inApp: true, push: true }.
        const result = await service.getRecipients({
          eventType: NotificationEvent.SPACE_COLLABORATION_CALLOUT_REACTION,
          userID: 'publisher-legacy',
        });

        // Default is { email: false, inApp: true, push: true }
        expect(result.emailRecipients).toHaveLength(0);
        expect(result.inAppRecipients).toHaveLength(1);
        expect(result.pushRecipients).toHaveLength(1);
      });
    });

    describe('poll notification events (T065)', () => {
      it('(a) POLL_VOTE_CAST_ON_OWN_POLL uses USER_SELF_MANAGEMENT credential for the poll creator', async () => {
        await service.getRecipients({
          eventType:
            NotificationEvent.SPACE_COLLABORATION_POLL_VOTE_CAST_ON_OWN_POLL,
          userID: 'creator-id',
        });

        expect(userLookupService.usersWithCredentials).toHaveBeenCalledWith(
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: 'creator-id',
            },
          ],
          undefined,
          expect.any(Object)
        );
      });

      it('(b) POLL_VOTE_CAST_ON_POLL_I_VOTED_ON uses USER_SELF_MANAGEMENT credential for each prior voter', async () => {
        await service.getRecipients({
          eventType:
            NotificationEvent.SPACE_COLLABORATION_POLL_VOTE_CAST_ON_POLL_I_VOTED_ON,
          userID: 'prior-voter-id',
        });

        expect(userLookupService.usersWithCredentials).toHaveBeenCalledWith(
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: 'prior-voter-id',
            },
          ],
          undefined,
          expect.any(Object)
        );
      });

      it('(c) POLL_MODIFIED_ON_POLL_I_VOTED_ON uses USER_SELF_MANAGEMENT credential for each remaining voter', async () => {
        await service.getRecipients({
          eventType:
            NotificationEvent.SPACE_COLLABORATION_POLL_MODIFIED_ON_POLL_I_VOTED_ON,
          userID: 'voter-id',
        });

        expect(userLookupService.usersWithCredentials).toHaveBeenCalledWith(
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: 'voter-id',
            },
          ],
          undefined,
          expect.any(Object)
        );
      });

      it('(d) POLL_VOTE_AFFECTED_BY_OPTION_CHANGE uses USER_SELF_MANAGEMENT credential for each affected voter', async () => {
        await service.getRecipients({
          eventType:
            NotificationEvent.SPACE_COLLABORATION_POLL_VOTE_AFFECTED_BY_OPTION_CHANGE,
          userID: 'affected-voter-id',
        });

        expect(userLookupService.usersWithCredentials).toHaveBeenCalledWith(
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: 'affected-voter-id',
            },
          ],
          undefined,
          expect.any(Object)
        );
      });

      it('(e) poll events throw ValidationException when userID is missing', async () => {
        await expect(
          service.getRecipients({
            eventType:
              NotificationEvent.SPACE_COLLABORATION_POLL_VOTE_CAST_ON_OWN_POLL,
            // no userID
          })
        ).rejects.toThrow(ValidationException);
      });
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
        credentials: [],
      } as unknown as IUser;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        userWithSettings,
      ]);
      vi.mocked(userLookupService.getUsersByIds).mockResolvedValue([
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
        credentials: [],
      } as unknown as IUser;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        user,
      ]);
      // Return the user only when called with matching IDs, empty otherwise
      vi.mocked(userLookupService.getUsersByIds).mockImplementation(
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

    it('routes USER_CONVERSATION_MESSAGE_DIRECT to notification.user.conversationMessageDirect (own row)', async () => {
      const user = {
        id: 'user-a',
        email: 'a@example.com',
        settings: {
          notification: {
            user: {
              messageReceived: { email: true, inApp: true, push: true },
              conversationMessageDirect: {
                email: false,
                inApp: false,
                push: true,
              },
              conversationMessageGroup: {
                email: true,
                inApp: false,
                push: true,
              },
            },
          },
        },
        credentials: [],
      } as unknown as IUser;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        user,
      ]);
      vi.mocked(userLookupService.getUsersByIds).mockImplementation(
        async (ids: string[]) => (ids.length > 0 ? [user] : [])
      );

      const result = await service.getRecipients({
        eventType: NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT,
        triggeredBy: 'sender-1',
        userIDs: ['user-a'],
      });

      // conversationMessageDirect.email is false — NOT the (true)
      // messageReceived or conversationMessageGroup rows.
      expect(result.emailRecipients).toHaveLength(0);
      expect(result.pushRecipients).toHaveLength(1);
    });

    it('routes USER_CONVERSATION_MESSAGE_GROUP to notification.user.conversationMessageGroup (own row)', async () => {
      const user = {
        id: 'user-a',
        email: 'a@example.com',
        settings: {
          notification: {
            user: {
              conversationMessageDirect: {
                email: true,
                inApp: false,
                push: true,
              },
              conversationMessageGroup: {
                email: false,
                inApp: false,
                push: false,
              },
            },
          },
        },
        credentials: [],
      } as unknown as IUser;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        user,
      ]);
      vi.mocked(userLookupService.getUsersByIds).mockImplementation(
        async (ids: string[]) => (ids.length > 0 ? [user] : [])
      );

      const result = await service.getRecipients({
        eventType: NotificationEvent.USER_CONVERSATION_MESSAGE_GROUP,
        triggeredBy: 'sender-1',
        userIDs: ['user-a'],
      });

      expect(result.emailRecipients).toHaveLength(0);
      expect(result.pushRecipients).toHaveLength(0);
    });

    it('corr-server-3: falls back to the mandated default (email:false,inApp:false,push:true) when a row predates the conversationMessageDirect/Group keys, instead of throwing', async () => {
      // Simulates a `user_settings` row created by an old pod during a
      // rolling deploy AFTER the one-shot backfill migration already ran —
      // `notification.user` exists but neither new key does.
      const user = {
        id: 'user-legacy',
        email: 'legacy@example.com',
        settings: {
          notification: {
            user: {
              messageReceived: { email: true, inApp: true, push: true },
              // conversationMessageDirect / conversationMessageGroup absent
            },
          },
        },
        credentials: [],
      } as unknown as IUser;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        user,
      ]);
      vi.mocked(userLookupService.getUsersByIds).mockImplementation(
        async (ids: string[]) => (ids.length > 0 ? [user] : [])
      );

      const directResult = await service.getRecipients({
        eventType: NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT,
        triggeredBy: 'sender-1',
        userIDs: ['user-legacy'],
      });
      // Default is email:false, push:true — no throw, no whole-batch loss.
      expect(directResult.emailRecipients).toHaveLength(0);
      expect(directResult.pushRecipients).toHaveLength(1);

      const groupResult = await service.getRecipients({
        eventType: NotificationEvent.USER_CONVERSATION_MESSAGE_GROUP,
        triggeredBy: 'sender-1',
        userIDs: ['user-legacy'],
      });
      expect(groupResult.emailRecipients).toHaveLength(0);
      expect(groupResult.pushRecipients).toHaveLength(1);
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
        credentials: [
          {
            type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
            resourceID: 'org-1',
          },
        ],
      } as unknown as IUser;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        adminUser,
      ]);
      vi.mocked(userLookupService.getUsersByIds).mockResolvedValue([adminUser]);
      vi.mocked(
        organizationLookupService.getOrganizationByIdOrFail
      ).mockResolvedValue(mockOrg);
      vi.mocked(
        authorizationService.isAccessGrantedForCredentials
      ).mockReturnValue(true);

      const result = await service.getRecipients({
        eventType: NotificationEvent.ORGANIZATION_ADMIN_MESSAGE,
        organizationID: 'org-1',
      });

      expect(
        organizationLookupService.getOrganizationByIdOrFail
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
        credentials: [
          {
            type: AuthorizationCredential.SPACE_MEMBER,
            resourceID: 'space-1',
          },
        ],
      } as unknown as IUser;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        memberUser,
      ]);
      vi.mocked(userLookupService.getUsersByIds).mockResolvedValue([
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
        credentials: [
          {
            type: AuthorizationCredential.SPACE_MEMBER,
            resourceID: 'space-1',
          },
        ],
      } as unknown as IUser;

      vi.mocked(userLookupService.usersWithCredentials).mockResolvedValue([
        memberUser,
      ]);
      vi.mocked(userLookupService.getUsersByIds).mockResolvedValue([
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
