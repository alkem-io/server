import { NOTIFICATIONS_SERVICE } from '@common/constants/providers';
import { ActorType } from '@common/enums/actor.type';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { NotificationEvent } from '@common/enums/notification.event';
import { RelationshipNotFoundException } from '@common/exceptions';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { NotificationExternalAdapter } from './notification.external.adapter';

describe('NotificationExternalAdapter', () => {
  let adapter: NotificationExternalAdapter;
  let notificationsClient: { emit: ReturnType<typeof vi.fn> };
  let actorLookupService: ActorLookupService;
  let userLookupService: UserLookupService;
  let urlGeneratorService: UrlGeneratorService;
  let configService: ConfigService;

  beforeEach(async () => {
    notificationsClient = { emit: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationExternalAdapter,
        {
          provide: NOTIFICATIONS_SERVICE,
          useValue: notificationsClient,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    adapter = module.get<NotificationExternalAdapter>(
      NotificationExternalAdapter
    );
    actorLookupService = module.get<ActorLookupService>(ActorLookupService);
    userLookupService = module.get<UserLookupService>(UserLookupService);
    urlGeneratorService = module.get<UrlGeneratorService>(UrlGeneratorService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('sendExternalNotifications', () => {
    it('should emit event to notifications client', async () => {
      const payload = { test: 'data' };
      await adapter.sendExternalNotifications(
        NotificationEvent.USER_MESSAGE,
        payload
      );

      expect(notificationsClient.emit).toHaveBeenCalledWith(
        NotificationEvent.USER_MESSAGE,
        payload
      );
    });
  });

  describe('buildSpaceCollaborationCreatedPayload', () => {
    const mockSetup = () => {
      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue({
        id: 'user-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        nameID: 'test-user',
        profile: { displayName: 'Test User' },
      } as any);
      vi.mocked(actorLookupService.getFullActorByIdOrFail).mockResolvedValue({
        id: 'actor-1',
        type: ActorType.USER,
        profile: { displayName: 'Actor' },
      } as any);
      vi.mocked(urlGeneratorService.getCalloutUrlPath).mockResolvedValue(
        '/callout/1'
      );
      vi.mocked(urlGeneratorService.getPostUrlPath).mockResolvedValue(
        '/post/1'
      );
      vi.mocked(urlGeneratorService.generateUrlForProfile).mockResolvedValue(
        '/space/1'
      );
      vi.mocked(
        urlGeneratorService.createSpaceAdminCommunityURL
      ).mockResolvedValue('/admin/1');
      vi.mocked(urlGeneratorService.createUrlForContributor).mockReturnValue(
        '/contributor/1'
      );
      vi.mocked(urlGeneratorService.createUrlForUserNameID).mockReturnValue(
        '/user/1'
      );
      vi.mocked(configService.get).mockReturnValue('https://platform.test');
    };

    it('should build payload for post contribution', async () => {
      mockSetup();

      const result = await adapter.buildSpaceCollaborationCreatedPayload(
        NotificationEvent.SPACE_COLLABORATION_CALLOUT_CONTRIBUTION,
        'user-1',
        [],
        {
          id: 'space-1',
          level: 1,
          about: { profile: { displayName: 'Space' } },
        } as any,
        {
          callout: {
            id: 'callout-1',
            framing: {
              id: 'framing-1',
              profile: { displayName: 'Callout', description: 'desc' },
              type: 'POST_COLLECTION',
            },
            settings: { contribution: { allowedTypes: ['POST'] } },
          },
          contribution: {
            id: 'contrib-1',
            createdBy: 'user-1',
            post: {
              id: 'post-1',
              createdBy: 'user-1',
              profile: { displayName: 'Post', description: 'desc' },
            },
          },
        } as any
      );

      expect(result.callout.id).toBe('callout-1');
      expect(result.callout.contribution?.type).toBe(
        CalloutContributionType.POST
      );
    });

    it('should throw RelationshipNotFoundException for unknown contribution type', async () => {
      mockSetup();

      await expect(
        adapter.buildSpaceCollaborationCreatedPayload(
          NotificationEvent.SPACE_COLLABORATION_CALLOUT_CONTRIBUTION,
          'user-1',
          [],
          {
            id: 'space-1',
            level: 1,
            about: { profile: { displayName: 'Space' } },
          } as any,
          {
            callout: {
              id: 'callout-1',
              framing: {
                id: 'framing-1',
                profile: { displayName: 'Callout', description: 'desc' },
                type: 'POST_COLLECTION',
              },
              settings: { contribution: { allowedTypes: ['POST'] } },
            },
            contribution: {
              id: 'contrib-1',
              // No post, whiteboard, link, or memo
            },
          } as any
        )
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should build payload for whiteboard contribution', async () => {
      mockSetup();
      vi.mocked(urlGeneratorService.getWhiteboardUrlPath).mockResolvedValue(
        '/whiteboard/1'
      );

      const result = await adapter.buildSpaceCollaborationCreatedPayload(
        NotificationEvent.SPACE_COLLABORATION_CALLOUT_CONTRIBUTION,
        'user-1',
        [],
        {
          id: 'space-1',
          level: 1,
          about: { profile: { displayName: 'Space' } },
        } as any,
        {
          callout: {
            id: 'callout-1',
            framing: {
              id: 'framing-1',
              profile: { displayName: 'Callout', description: 'desc' },
              type: 'WHITEBOARD_COLLECTION',
            },
            settings: {
              contribution: { allowedTypes: ['WHITEBOARD'] },
            },
          },
          contribution: {
            id: 'contrib-1',
            createdBy: 'user-1',
            whiteboard: {
              id: 'wb-1',
              nameID: 'wb-name',
              createdBy: 'user-1',
              profile: { displayName: 'WB', description: 'desc' },
            },
          },
        } as any
      );

      expect(result.callout.contribution?.type).toBe(
        CalloutContributionType.WHITEBOARD
      );
    });

    it('should build payload for link contribution', async () => {
      mockSetup();

      const result = await adapter.buildSpaceCollaborationCreatedPayload(
        NotificationEvent.SPACE_COLLABORATION_CALLOUT_CONTRIBUTION,
        'user-1',
        [],
        {
          id: 'space-1',
          level: 1,
          about: { profile: { displayName: 'Space' } },
        } as any,
        {
          callout: {
            id: 'callout-1',
            framing: {
              id: 'framing-1',
              profile: { displayName: 'Callout', description: 'desc' },
              type: 'LINK_COLLECTION',
            },
            settings: { contribution: { allowedTypes: ['LINK'] } },
          },
          contribution: {
            id: 'contrib-1',
            createdBy: 'user-1',
            link: {
              id: 'link-1',
              profile: { displayName: 'Link', description: 'desc' },
            },
          },
        } as any
      );

      expect(result.callout.contribution?.type).toBe(
        CalloutContributionType.LINK
      );
    });

    it('should build payload for memo contribution', async () => {
      mockSetup();
      vi.mocked(urlGeneratorService.getMemoUrlPath).mockResolvedValue(
        '/memo/1'
      );

      const result = await adapter.buildSpaceCollaborationCreatedPayload(
        NotificationEvent.SPACE_COLLABORATION_CALLOUT_CONTRIBUTION,
        'user-1',
        [],
        {
          id: 'space-1',
          level: 1,
          about: { profile: { displayName: 'Space' } },
        } as any,
        {
          callout: {
            id: 'callout-1',
            framing: {
              id: 'framing-1',
              profile: { displayName: 'Callout', description: 'desc' },
              type: 'MEMO_COLLECTION',
            },
            settings: { contribution: { allowedTypes: ['MEMO'] } },
          },
          contribution: {
            id: 'contrib-1',
            createdBy: 'user-1',
            memo: {
              id: 'memo-1',
              nameID: 'memo-name',
              createdBy: 'user-1',
              profile: { displayName: 'Memo', description: 'desc' },
            },
          },
        } as any
      );

      expect(result.callout.contribution?.type).toBe(
        CalloutContributionType.MEMO
      );
    });
  });

  describe('buildPlatformUserRemovedNotificationPayload', () => {
    it('should build payload with user display name and email', async () => {
      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue({
        id: 'user-1',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@test.com',
        nameID: 'admin-user',
        profile: { displayName: 'Admin User' },
      } as any);
      vi.mocked(configService.get).mockReturnValue('https://platform.test');
      vi.mocked(urlGeneratorService.createUrlForUserNameID).mockReturnValue(
        '/user/1'
      );

      const result = await adapter.buildPlatformUserRemovedNotificationPayload(
        NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_REMOVED,
        'admin-1',
        [],
        {
          profile: { displayName: 'Removed User' },
          email: 'removed@test.com',
        } as any
      );

      expect(result.user.displayName).toBe('Removed User');
      expect(result.user.email).toBe('removed@test.com');
    });
  });

  describe('buildSpaceCommunityApplicationCreatedNotificationPayload', () => {
    it('should build application payload with applicant', async () => {
      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue({
        id: 'user-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        nameID: 'test-user',
        profile: { displayName: 'Test User' },
      } as any);
      vi.mocked(actorLookupService.getFullActorByIdOrFail).mockResolvedValue({
        id: 'actor-1',
        type: ActorType.USER,
        profile: { displayName: 'Actor' },
      } as any);
      vi.mocked(urlGeneratorService.generateUrlForProfile).mockResolvedValue(
        '/space/1'
      );
      vi.mocked(
        urlGeneratorService.createSpaceAdminCommunityURL
      ).mockResolvedValue('/admin/1');
      vi.mocked(urlGeneratorService.createUrlForContributor).mockReturnValue(
        '/contributor/1'
      );
      vi.mocked(urlGeneratorService.createUrlForUserNameID).mockReturnValue(
        '/user/1'
      );
      vi.mocked(configService.get).mockReturnValue('https://platform.test');

      const result =
        await adapter.buildSpaceCommunityApplicationCreatedNotificationPayload(
          NotificationEvent.SPACE_ADMIN_COMMUNITY_APPLICATION,
          'user-1',
          [],
          {
            id: 'space-1',
            level: 1,
            about: { profile: { displayName: 'Space' } },
          } as any
        );

      expect(result.applicant).toBeDefined();
      expect(result.applicant.id).toBe('actor-1');
    });
  });

  describe('buildSpaceCommunityNewMemberPayload', () => {
    it('should build new member payload', async () => {
      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue({
        id: 'user-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        nameID: 'test-user',
        profile: { displayName: 'Test User' },
      } as any);
      vi.mocked(actorLookupService.getFullActorByIdOrFail).mockResolvedValue({
        id: 'member-1',
        type: ActorType.USER,
        profile: { displayName: 'New Member' },
      } as any);
      vi.mocked(urlGeneratorService.generateUrlForProfile).mockResolvedValue(
        '/space/1'
      );
      vi.mocked(
        urlGeneratorService.createSpaceAdminCommunityURL
      ).mockResolvedValue('/admin/1');
      vi.mocked(urlGeneratorService.createUrlForContributor).mockReturnValue(
        '/contributor/1'
      );
      vi.mocked(urlGeneratorService.createUrlForUserNameID).mockReturnValue(
        '/user/1'
      );
      vi.mocked(configService.get).mockReturnValue('https://platform.test');

      const result = await adapter.buildSpaceCommunityNewMemberPayload(
        NotificationEvent.SPACE_ADMIN_COMMUNITY_NEW_MEMBER,
        'user-1',
        [],
        {
          id: 'space-1',
          level: 1,
          about: { profile: { displayName: 'Space' } },
        } as any,
        'member-1'
      );

      expect(result.contributor).toBeDefined();
      expect(result.contributor.id).toBe('member-1');
    });
  });

  describe('buildSpaceCollaborationCalloutPublishedPayload', () => {
    it('should build published callout payload', async () => {
      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue({
        id: 'user-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        nameID: 'test-user',
        profile: { displayName: 'Test User' },
      } as any);
      vi.mocked(urlGeneratorService.generateUrlForProfile).mockResolvedValue(
        '/space/1'
      );
      vi.mocked(
        urlGeneratorService.createSpaceAdminCommunityURL
      ).mockResolvedValue('/admin/1');
      vi.mocked(urlGeneratorService.getCalloutUrlPath).mockResolvedValue(
        '/callout/1'
      );
      vi.mocked(urlGeneratorService.createUrlForUserNameID).mockReturnValue(
        '/user/1'
      );
      vi.mocked(configService.get).mockReturnValue('https://platform.test');

      const result =
        await adapter.buildSpaceCollaborationCalloutPublishedPayload(
          NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED,
          'user-1',
          [],
          {
            id: 'space-1',
            level: 1,
            about: { profile: { displayName: 'Space' } },
          } as any,
          {
            id: 'callout-1',
            framing: {
              id: 'framing-1',
              profile: { displayName: 'Callout', description: 'desc' },
              type: 'POST_COLLECTION',
            },
          } as any
        );

      expect(result.callout.id).toBe('callout-1');
    });
  });

  describe('buildUserMessageSentNotificationPayload', () => {
    it('should build message payload with sender and receiver', async () => {
      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue({
        id: 'user-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        nameID: 'test-user',
        profile: { displayName: 'Test User' },
      } as any);
      vi.mocked(actorLookupService.getFullActorByIdOrFail).mockResolvedValue({
        id: 'receiver-1',
        type: ActorType.USER,
        profile: { displayName: 'Receiver' },
      } as any);
      vi.mocked(urlGeneratorService.createUrlForContributor).mockReturnValue(
        '/contributor/1'
      );
      vi.mocked(urlGeneratorService.createUrlForUserNameID).mockReturnValue(
        '/user/1'
      );
      vi.mocked(configService.get).mockReturnValue('https://platform.test');

      const result = await adapter.buildUserMessageSentNotificationPayload(
        NotificationEvent.USER_MESSAGE,
        'user-1',
        [],
        'receiver-1',
        'Hello!'
      );

      expect(result.message).toBe('Hello!');
    });
  });

  describe('buildPlatformUserRegisteredNotificationPayload', () => {
    it('should build user registered payload', async () => {
      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue({
        id: 'user-1',
        firstName: 'New',
        lastName: 'User',
        email: 'new@test.com',
        nameID: 'new-user',
        profile: { displayName: 'New User' },
      } as any);
      vi.mocked(urlGeneratorService.createUrlForUserNameID).mockReturnValue(
        '/user/1'
      );
      vi.mocked(configService.get).mockReturnValue('https://platform.test');

      const result =
        await adapter.buildPlatformUserRegisteredNotificationPayload(
          NotificationEvent.USER_SIGN_UP_WELCOME,
          'user-1',
          [],
          'user-1'
        );

      expect(result.user).toBeDefined();
      expect(result.user.firstName).toBe('New');
    });
  });

  describe('buildNotificationPayloadUserSpaceCommunityInvitation', () => {
    it('should build invitation payload with invitee', async () => {
      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue({
        id: 'user-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        nameID: 'test-user',
        profile: { displayName: 'Test User' },
      } as any);
      vi.mocked(actorLookupService.getFullActorByIdOrFail).mockResolvedValue({
        id: 'invited-1',
        type: ActorType.USER,
        profile: { displayName: 'Invited' },
      } as any);
      vi.mocked(urlGeneratorService.generateUrlForProfile).mockResolvedValue(
        '/space/1'
      );
      vi.mocked(
        urlGeneratorService.createSpaceAdminCommunityURL
      ).mockResolvedValue('/admin/1');
      vi.mocked(urlGeneratorService.createUrlForContributor).mockReturnValue(
        '/contributor/1'
      );
      vi.mocked(urlGeneratorService.createUrlForUserNameID).mockReturnValue(
        '/user/1'
      );
      vi.mocked(configService.get).mockReturnValue('https://platform.test');

      const result =
        await adapter.buildNotificationPayloadUserSpaceCommunityInvitation(
          NotificationEvent.USER_SPACE_COMMUNITY_INVITATION,
          'user-1',
          [],
          'invited-1',
          {
            id: 'space-1',
            level: 1,
            about: { profile: { displayName: 'Space' } },
          } as any,
          'Welcome!'
        );

      expect(result.invitee).toBeDefined();
      expect(result.welcomeMessage).toBe('Welcome!');
    });
  });

  describe('buildSpaceCommunicationUpdateSentNotificationPayload', () => {
    it('should build update sent payload', async () => {
      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue({
        id: 'user-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        nameID: 'test-user',
        profile: { displayName: 'Test User' },
      } as any);
      vi.mocked(actorLookupService.getFullActorByIdOrFail).mockResolvedValue({
        id: 'user-1',
        type: ActorType.USER,
        profile: { displayName: 'Test User' },
      } as any);
      vi.mocked(urlGeneratorService.generateUrlForProfile).mockResolvedValue(
        '/space/1'
      );
      vi.mocked(
        urlGeneratorService.createSpaceAdminCommunityURL
      ).mockResolvedValue('/admin/1');
      vi.mocked(urlGeneratorService.createUrlForContributor).mockReturnValue(
        '/contributor/1'
      );
      vi.mocked(urlGeneratorService.createUrlForUserNameID).mockReturnValue(
        '/user/1'
      );
      vi.mocked(configService.get).mockReturnValue('https://platform.test');

      const result =
        await adapter.buildSpaceCommunicationUpdateSentNotificationPayload(
          NotificationEvent.SPACE_COMMUNICATION_UPDATE,
          'user-1',
          [],
          {
            id: 'space-1',
            level: 1,
            about: { profile: { displayName: 'Space' } },
          } as any,
          { id: 'updates-1' } as any,
          { message: 'Update text' } as any
        );

      expect(result.update).toBeDefined();
      expect(result.message).toBe('Update text');
    });
  });

  describe('buildPlatformGlobalRoleChangedNotificationPayload', () => {
    it('should build role change payload', async () => {
      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue({
        id: 'user-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        nameID: 'test-user',
        profile: { displayName: 'Test User' },
      } as any);
      vi.mocked(urlGeneratorService.createUrlForUserNameID).mockReturnValue(
        '/user/1'
      );
      vi.mocked(configService.get).mockReturnValue('https://platform.test');

      const result =
        await adapter.buildPlatformGlobalRoleChangedNotificationPayload(
          NotificationEvent.PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED,
          'admin-1',
          [],
          'user-1',
          'GRANT' as any,
          'GLOBAL_ADMIN'
        );

      expect(result.role).toBe('GLOBAL_ADMIN');
      expect(result.type).toBe('GRANT');
    });
  });

  describe('buildOrganizationMentionNotificationPayload', () => {
    it('should build organization mention payload', async () => {
      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue({
        id: 'user-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        nameID: 'test-user',
        profile: { displayName: 'Test User' },
      } as any);
      vi.mocked(actorLookupService.getFullActorByIdOrFail).mockResolvedValue({
        id: 'org-1',
        type: ActorType.ORGANIZATION,
        profile: { displayName: 'Org' },
      } as any);
      vi.mocked(urlGeneratorService.createUrlForContributor).mockReturnValue(
        '/org/1'
      );
      vi.mocked(urlGeneratorService.createUrlForUserNameID).mockReturnValue(
        '/user/1'
      );
      vi.mocked(configService.get).mockReturnValue('https://platform.test');

      const result = await adapter.buildOrganizationMentionNotificationPayload(
        NotificationEvent.ORGANIZATION_ADMIN_MENTIONED,
        'user-1',
        [],
        'org-1',
        {
          message: 'Hello @org',
          parent: { url: '/url', displayName: 'Context' },
        } as any
      );

      expect(result.organization).toBeDefined();
      expect(result.comment).toBe('Hello @org');
    });
  });

  describe('buildOrganizationMessageNotificationPayload', () => {
    it('should build organization message payload', async () => {
      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue({
        id: 'user-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        nameID: 'test-user',
        profile: { displayName: 'Test User' },
      } as any);
      vi.mocked(actorLookupService.getFullActorByIdOrFail).mockResolvedValue({
        id: 'org-1',
        type: ActorType.ORGANIZATION,
        profile: { displayName: 'Org' },
      } as any);
      vi.mocked(urlGeneratorService.createUrlForContributor).mockReturnValue(
        '/org/1'
      );
      vi.mocked(urlGeneratorService.createUrlForUserNameID).mockReturnValue(
        '/user/1'
      );
      vi.mocked(configService.get).mockReturnValue('https://platform.test');

      const result = await adapter.buildOrganizationMessageNotificationPayload(
        NotificationEvent.ORGANIZATION_ADMIN_MESSAGE,
        'user-1',
        [],
        'Direct message',
        'org-1'
      );

      expect(result.organization).toBeDefined();
      expect(result.message).toBe('Direct message');
    });
  });
});
