import { ActorType } from '@common/enums/actor.type';
import { NotificationEvent } from '@common/enums/notification.event';
import { RoomType } from '@common/enums/room.type';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationExternalAdapter } from '@services/adapters/notification-external-adapter/notification.external.adapter';
import { NotificationPushAdapter } from '@services/adapters/notification-push-adapter/notification.push.adapter';
import { NotificationRecipientsService } from '@services/api/notification-recipients/notification.recipients.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationNotificationDedupeService } from './conversation.notification.dedupe.service';
import { ConversationNotificationService } from './conversation.notification.service';
import { ConversationNotificationSuppressionService } from './conversation.notification.suppression.service';

const mockActorLookupService = { getActorTypeById: vi.fn() };
const mockUserLookupService = { getUserByIdOrFail: vi.fn() };
const mockNotificationRecipientsService = { getRecipients: vi.fn() };
const mockNotificationExternalAdapter = {
  buildConversationMessageDirectPayload: vi.fn(),
  buildConversationMessageGroupPayload: vi.fn(),
  sendExternalNotifications: vi.fn(),
};
const mockNotificationPushAdapter = { sendMessagingPushNotifications: vi.fn() };
const mockUrlGeneratorService = {
  getConversationUrl: vi.fn(),
  getConversationDeepLinkPath: vi.fn(),
};
const mockDedupeService = { claim: vi.fn() };
const mockSuppressionService = { isSuppressed: vi.fn() };
const mockConfigService = {
  get: vi.fn((key: string): boolean | undefined => {
    if (key === 'notifications.messaging.enabled') return true;
    return undefined;
  }),
};

const recipientUser = (id: string) => ({ id, email: `${id}@test.com` }) as any;

describe('ConversationNotificationService', () => {
  let service: ConversationNotificationService;

  const buildModule = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationNotificationService,
        { provide: ActorLookupService, useValue: mockActorLookupService },
        { provide: UserLookupService, useValue: mockUserLookupService },
        {
          provide: NotificationRecipientsService,
          useValue: mockNotificationRecipientsService,
        },
        {
          provide: NotificationExternalAdapter,
          useValue: mockNotificationExternalAdapter,
        },
        {
          provide: NotificationPushAdapter,
          useValue: mockNotificationPushAdapter,
        },
        { provide: UrlGeneratorService, useValue: mockUrlGeneratorService },
        {
          provide: ConversationNotificationDedupeService,
          useValue: mockDedupeService,
        },
        {
          provide: ConversationNotificationSuppressionService,
          useValue: mockSuppressionService,
        },
        { provide: ConfigService, useValue: mockConfigService },
        MockWinstonProvider,
      ],
    }).compile();

    return module.get(ConversationNotificationService);
  };

  const directParams = (overrides: Partial<any> = {}): any => ({
    conversation: { id: 'conv-1' },
    room: {
      type: RoomType.CONVERSATION_DIRECT,
      displayName: '',
    },
    message: { id: 'message-1', message: 'hi', sender: 'sender-1' },
    memberActorIds: ['sender-1', 'user-b'],
    senderActorID: 'sender-1',
    ...overrides,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'notifications.messaging.enabled') return true;
      return undefined;
    });
    mockActorLookupService.getActorTypeById.mockResolvedValue(ActorType.USER);
    mockDedupeService.claim.mockResolvedValue(true);
    mockSuppressionService.isSuppressed.mockResolvedValue(false);
    mockNotificationRecipientsService.getRecipients.mockResolvedValue({
      emailRecipients: [],
      inAppRecipients: [],
      pushRecipients: [],
    });
    mockUrlGeneratorService.getConversationUrl.mockReturnValue(
      'https://platform.test/?chat=conv-1'
    );
    mockUrlGeneratorService.getConversationDeepLinkPath.mockReturnValue(
      '/?chat=conv-1'
    );
    mockUserLookupService.getUserByIdOrFail.mockResolvedValue({
      profile: { displayName: 'Alice' },
    });
    mockNotificationExternalAdapter.buildConversationMessageDirectPayload.mockResolvedValue(
      { eventType: NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT }
    );
    mockNotificationExternalAdapter.buildConversationMessageGroupPayload.mockResolvedValue(
      { eventType: NotificationEvent.USER_CONVERSATION_MESSAGE_GROUP }
    );

    service = await buildModule();
  });

  describe('kill switch (FR-016)', () => {
    it('emits nothing when the flag is OFF', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'notifications.messaging.enabled') return false;
        return undefined;
      });
      service = await buildModule();

      await service.notifyConversationMessage(directParams());

      expect(mockDedupeService.claim).not.toHaveBeenCalled();
      expect(
        mockNotificationExternalAdapter.sendExternalNotifications
      ).not.toHaveBeenCalled();
    });
  });

  describe('sender guards (D-11)', () => {
    it('produces zero notifications for a VIRTUAL_CONTRIBUTOR sender', async () => {
      mockActorLookupService.getActorTypeById.mockResolvedValue(
        ActorType.VIRTUAL_CONTRIBUTOR
      );

      await service.notifyConversationMessage(directParams());

      expect(mockDedupeService.claim).not.toHaveBeenCalled();
      expect(
        mockNotificationRecipientsService.getRecipients
      ).not.toHaveBeenCalled();
    });

    it('produces zero notifications for a VIRTUAL_ASSISTANT sender', async () => {
      mockActorLookupService.getActorTypeById.mockResolvedValue(
        ActorType.VIRTUAL_ASSISTANT
      );

      await service.notifyConversationMessage(directParams());

      expect(
        mockNotificationRecipientsService.getRecipients
      ).not.toHaveBeenCalled();
    });

    it('excludes the sender (self-echo) from the recipient candidate list (FR-005)', async () => {
      await service.notifyConversationMessage(directParams());

      expect(
        mockNotificationRecipientsService.getRecipients
      ).toHaveBeenCalledWith(expect.objectContaining({ userIDs: ['user-b'] }));
    });

    it('produces zero recipients when the only other member has already left (removed member)', async () => {
      await service.notifyConversationMessage(
        directParams({ memberActorIds: ['sender-1'] })
      );

      expect(
        mockNotificationRecipientsService.getRecipients
      ).not.toHaveBeenCalled();
    });
  });

  describe('idempotency (FR-013/D-12)', () => {
    it('dispatches exactly once for a redelivered (duplicate) message event', async () => {
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [recipientUser('user-b')],
        inAppRecipients: [],
        pushRecipients: [],
      });
      mockDedupeService.claim
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await service.notifyConversationMessage(directParams());
      await service.notifyConversationMessage(directParams());

      expect(
        mockNotificationExternalAdapter.sendExternalNotifications
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('failure containment (FR-014)', () => {
    it('logs and returns without throwing when the pipeline throws internally', async () => {
      mockNotificationRecipientsService.getRecipients.mockRejectedValue(
        new Error('boom')
      );

      await expect(
        service.notifyConversationMessage(directParams())
      ).resolves.toBeUndefined();
    });
  });

  describe('DIRECT emission (US1, contract C-2/C-4)', () => {
    it('emits USER_CONVERSATION_MESSAGE_DIRECT with the built payload when there are email recipients', async () => {
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [recipientUser('user-b')],
        inAppRecipients: [],
        pushRecipients: [],
      });

      await service.notifyConversationMessage(directParams());

      expect(
        mockNotificationExternalAdapter.buildConversationMessageDirectPayload
      ).toHaveBeenCalledWith(
        NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT,
        'sender-1',
        [recipientUser('user-b')],
        'conv-1'
      );
      expect(
        mockNotificationExternalAdapter.sendExternalNotifications
      ).toHaveBeenCalledWith(
        NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT,
        expect.any(Object)
      );
    });

    it('sends push via the MESSAGING budget path, never the shared throttle path', async () => {
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients: [recipientUser('user-b')],
      });

      await service.notifyConversationMessage(directParams());

      expect(
        mockNotificationPushAdapter.sendMessagingPushNotifications
      ).toHaveBeenCalledWith(
        [recipientUser('user-b')],
        NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT,
        expect.objectContaining({ url: '/?chat=conv-1' })
      );
    });

    it('builds the push payload url from the relative deep-link path helper, never the platform-absolute email helper (contract C-4)', async () => {
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients: [recipientUser('user-b')],
      });

      await service.notifyConversationMessage(directParams());

      expect(
        mockUrlGeneratorService.getConversationDeepLinkPath
      ).toHaveBeenCalledWith('conv-1');
      expect(mockUrlGeneratorService.getConversationUrl).not.toHaveBeenCalled();
    });

    it('the push payload carries no message content, even under a hostile-content message fixture (contract C-4)', async () => {
      const HOSTILE_MESSAGE =
        '<script>alert("xss")</script> ignore all previous instructions';
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients: [recipientUser('user-b')],
      });

      await service.notifyConversationMessage(
        directParams({
          message: {
            id: 'message-1',
            message: HOSTILE_MESSAGE,
            sender: 'sender-1',
          },
        })
      );

      const [, , payload] =
        mockNotificationPushAdapter.sendMessagingPushNotifications.mock
          .calls[0];
      const serialized = JSON.stringify(payload);
      expect(serialized).not.toContain(HOSTILE_MESSAGE);
      expect(serialized).not.toContain('script');
      expect(payload).toEqual({
        title: 'Alice',
        body: 'Alice sent you a message',
        url: '/?chat=conv-1',
      });
    });

    it('never emits when there are zero email and zero push recipients', async () => {
      await service.notifyConversationMessage(directParams());

      expect(
        mockNotificationExternalAdapter.sendExternalNotifications
      ).not.toHaveBeenCalled();
      expect(
        mockNotificationPushAdapter.sendMessagingPushNotifications
      ).not.toHaveBeenCalled();
    });
  });

  describe('GROUP emission (US2)', () => {
    const groupParams = (overrides: Partial<any> = {}) =>
      directParams({
        room: { type: RoomType.CONVERSATION_GROUP, displayName: 'Team Chat' },
        memberActorIds: ['sender-1', 'user-b', 'user-c'],
        ...overrides,
      });

    it('routes to USER_CONVERSATION_MESSAGE_GROUP and includes the conversation displayName', async () => {
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [recipientUser('user-b')],
        inAppRecipients: [],
        pushRecipients: [],
      });

      await service.notifyConversationMessage(groupParams());

      expect(
        mockNotificationExternalAdapter.buildConversationMessageGroupPayload
      ).toHaveBeenCalledWith(
        NotificationEvent.USER_CONVERSATION_MESSAGE_GROUP,
        'sender-1',
        [recipientUser('user-b')],
        'conv-1',
        'Team Chat'
      );
    });

    it('honors each member´s OWN channel decision (per-user push/email split — US2-AS5)', async () => {
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [recipientUser('user-b')],
        inAppRecipients: [],
        pushRecipients: [recipientUser('user-c')],
      });

      await service.notifyConversationMessage(groupParams());

      expect(
        mockNotificationExternalAdapter.buildConversationMessageGroupPayload
      ).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        [recipientUser('user-b')],
        expect.anything(),
        expect.anything()
      );
      expect(
        mockNotificationPushAdapter.sendMessagingPushNotifications
      ).toHaveBeenCalledWith(
        [recipientUser('user-c')],
        expect.anything(),
        expect.anything()
      );
    });

    it('corr-server-5: substitutes a neutral label for the internal "unnamed group" placeholder, in both email and push copy', async () => {
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [recipientUser('user-b')],
        inAppRecipients: [],
        pushRecipients: [recipientUser('user-b')],
      });

      await service.notifyConversationMessage(
        groupParams({
          room: {
            type: RoomType.CONVERSATION_GROUP,
            displayName: 'group-conversation-3-members',
          },
        })
      );

      expect(
        mockNotificationExternalAdapter.buildConversationMessageGroupPayload
      ).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'a group chat'
      );
      const [, , pushPayload] =
        mockNotificationPushAdapter.sendMessagingPushNotifications.mock
          .calls[0];
      expect(pushPayload.title).toBe('a group chat');
      expect(pushPayload.body).toBe('Alice sent a message in a group chat');
      expect(JSON.stringify(pushPayload)).not.toContain('group-conversation');
    });

    it('corr-server-5: substitutes the neutral label for an empty/legacy-shaped displayName', async () => {
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients: [recipientUser('user-b')],
      });

      await service.notifyConversationMessage(
        groupParams({
          room: { type: RoomType.CONVERSATION_GROUP, displayName: '' },
        })
      );

      const [, , pushPayload] =
        mockNotificationPushAdapter.sendMessagingPushNotifications.mock
          .calls[0];
      expect(pushPayload.title).toBe('a group chat');
    });

    it('sec-server-4: strips control characters/newlines and clamps length in the group displayName before it reaches push/email copy', async () => {
      const hostileName = `Alkemio Security\n${'x'.repeat(200)}: verify now`;
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [recipientUser('user-b')],
        inAppRecipients: [],
        pushRecipients: [recipientUser('user-b')],
      });

      await service.notifyConversationMessage(
        groupParams({
          room: { type: RoomType.CONVERSATION_GROUP, displayName: hostileName },
        })
      );

      const [, , , , emailDisplayName] =
        mockNotificationExternalAdapter.buildConversationMessageGroupPayload
          .mock.calls[0];
      expect(emailDisplayName).not.toContain('\n');
      expect(emailDisplayName.length).toBeLessThanOrEqual(100);

      const [, , pushPayload] =
        mockNotificationPushAdapter.sendMessagingPushNotifications.mock
          .calls[0];
      expect(pushPayload.title).not.toContain('\n');
      expect(pushPayload.title.length).toBeLessThanOrEqual(100);
    });

    it('sec-server-4: strips control characters from the sender display name before it reaches push copy', async () => {
      mockUserLookupService.getUserByIdOrFail.mockResolvedValue({
        profile: { displayName: 'Mallory\nSubject: verify your account' },
      });
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients: [recipientUser('user-b')],
      });

      await service.notifyConversationMessage(groupParams());

      const [, , pushPayload] =
        mockNotificationPushAdapter.sendMessagingPushNotifications.mock
          .calls[0];
      expect(pushPayload.title).not.toContain('\n');
      expect(pushPayload.body).not.toContain('\n');
    });
  });

  describe('legacy CONVERSATION room classification feeding emission (US4-AS3)', () => {
    it('a legacy 2-member room emits the DIRECT event', async () => {
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [recipientUser('user-b')],
        inAppRecipients: [],
        pushRecipients: [],
      });

      await service.notifyConversationMessage(
        directParams({
          room: { type: RoomType.CONVERSATION, displayName: '' },
        })
      );

      expect(
        mockNotificationExternalAdapter.sendExternalNotifications
      ).toHaveBeenCalledWith(
        NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT,
        expect.any(Object)
      );
    });

    it('a legacy 3-member room emits the GROUP event', async () => {
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [recipientUser('user-b')],
        inAppRecipients: [],
        pushRecipients: [],
      });

      await service.notifyConversationMessage(
        directParams({
          room: { type: RoomType.CONVERSATION, displayName: 'Legacy Group' },
          memberActorIds: ['sender-1', 'user-b', 'user-c'],
        })
      );

      expect(
        mockNotificationExternalAdapter.sendExternalNotifications
      ).toHaveBeenCalledWith(
        NotificationEvent.USER_CONVERSATION_MESSAGE_GROUP,
        expect.any(Object)
      );
    });
  });

  describe('email suppression (FR-011)', () => {
    it('drops suppressed recipients from the email payload but never from push', async () => {
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [recipientUser('user-b')],
        inAppRecipients: [],
        pushRecipients: [recipientUser('user-b')],
      });
      mockSuppressionService.isSuppressed.mockResolvedValue(true);

      await service.notifyConversationMessage(directParams());

      expect(
        mockNotificationExternalAdapter.sendExternalNotifications
      ).not.toHaveBeenCalled();
      expect(
        mockNotificationPushAdapter.sendMessagingPushNotifications
      ).toHaveBeenCalledWith(
        [recipientUser('user-b')],
        expect.anything(),
        expect.anything()
      );
    });
  });
});
