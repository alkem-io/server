import { ActorType } from '@common/enums/actor.type';
import { NotificationEvent } from '@common/enums/notification.event';
import { RoomType } from '@common/enums/room.type';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationRecipientsService } from '@services/api/notification-recipients/notification.recipients.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationDigestSchedulerService } from './conversation.digest.scheduler.service';
import { ConversationNotificationDedupeService } from './conversation.notification.dedupe.service';
import { ConversationNotificationService } from './conversation.notification.service';

const mockActorLookupService = { getActorTypeById: vi.fn() };
const mockNotificationRecipientsService = { getRecipients: vi.fn() };
const mockDedupeService = { claim: vi.fn() };
const mockDigestSchedulerService = { arm: vi.fn() };
const mockConfigService = {
  get: vi.fn((key: string): boolean | undefined => {
    if (key === 'notifications.messaging.enabled') return true;
    return undefined;
  }),
};

const recipientUser = (id: string) => ({ id, email: `${id}@test.com` }) as any;

/**
 * 034/R4 — the ARRIVAL path. Every assertion here is about what is ARMED,
 * because after Operator Ruling R4 this class sends nothing at all: no email,
 * no push, no template render, no unread check. Its entire output is Redis
 * writes (data-model §8.1). The dispatch decisions moved to
 * `ConversationDigestFlushService`.
 */
describe('ConversationNotificationService (arrival path — arms only)', () => {
  let service: ConversationNotificationService;

  const armedTracks = () =>
    mockDigestSchedulerService.arm.mock.calls.map(
      ([track, conversationId]) => ({
        channel: track.channel,
        kind: track.kind,
        userId: track.userId,
        conversationId,
      })
    );

  const buildModule = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationNotificationService,
        { provide: ActorLookupService, useValue: mockActorLookupService },
        {
          provide: NotificationRecipientsService,
          useValue: mockNotificationRecipientsService,
        },
        {
          provide: ConversationNotificationDedupeService,
          useValue: mockDedupeService,
        },
        {
          provide: ConversationDigestSchedulerService,
          useValue: mockDigestSchedulerService,
        },
        { provide: ConfigService, useValue: mockConfigService },
        MockWinstonProvider,
      ],
    }).compile();

    return module.get(ConversationNotificationService);
  };

  const directParams = (overrides: Partial<any> = {}): any => ({
    conversation: { id: 'conv-1' },
    room: { type: RoomType.CONVERSATION_DIRECT, displayName: '' },
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
    mockDigestSchedulerService.arm.mockResolvedValue(undefined);
    mockNotificationRecipientsService.getRecipients.mockResolvedValue({
      emailRecipients: [],
      inAppRecipients: [],
      pushRecipients: [],
    });

    service = await buildModule();
  });

  describe('kill switch (FR-016)', () => {
    it('arms nothing when the flag is OFF', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'notifications.messaging.enabled') return false;
        return undefined;
      });
      service = await buildModule();

      await service.notifyConversationMessage(directParams());

      expect(mockDigestSchedulerService.arm).not.toHaveBeenCalled();
      expect(mockDedupeService.claim).not.toHaveBeenCalled();
      expect(
        mockNotificationRecipientsService.getRecipients
      ).not.toHaveBeenCalled();
    });
  });

  describe('sender guards (D-11)', () => {
    it('arms nothing for a VIRTUAL_CONTRIBUTOR sender', async () => {
      mockActorLookupService.getActorTypeById.mockResolvedValue(
        ActorType.VIRTUAL_CONTRIBUTOR
      );

      await service.notifyConversationMessage(directParams());

      expect(mockDigestSchedulerService.arm).not.toHaveBeenCalled();
    });

    it('arms nothing for a VIRTUAL_ASSISTANT sender', async () => {
      mockActorLookupService.getActorTypeById.mockResolvedValue(
        ActorType.VIRTUAL_ASSISTANT
      );

      await service.notifyConversationMessage(directParams());

      expect(mockDigestSchedulerService.arm).not.toHaveBeenCalled();
    });

    it('excludes the sender (self-echo) from the recipient candidate list (FR-005)', async () => {
      await service.notifyConversationMessage(directParams());

      expect(
        mockNotificationRecipientsService.getRecipients
      ).toHaveBeenCalledWith(expect.objectContaining({ userIDs: ['user-b'] }));
    });

    it('arms nothing when the only other member has already left', async () => {
      await service.notifyConversationMessage(
        directParams({ memberActorIds: ['sender-1'] })
      );

      expect(
        mockNotificationRecipientsService.getRecipients
      ).not.toHaveBeenCalled();
      expect(mockDigestSchedulerService.arm).not.toHaveBeenCalled();
    });
  });

  describe('idempotency (FR-013/D-12)', () => {
    it('arms nothing for a redelivered (duplicate) message event', async () => {
      mockDedupeService.claim.mockResolvedValue(false);

      await service.notifyConversationMessage(directParams());

      expect(mockDigestSchedulerService.arm).not.toHaveBeenCalled();
    });

    it('runs the dedupe claim AFTER the bot-sender guard, so bot traffic never consumes a marker', async () => {
      mockActorLookupService.getActorTypeById.mockResolvedValue(
        ActorType.VIRTUAL_CONTRIBUTOR
      );

      await service.notifyConversationMessage(directParams());

      expect(mockDedupeService.claim).not.toHaveBeenCalled();
    });
  });

  describe('failure containment (FR-014)', () => {
    it('logs and returns without throwing when the pipeline throws internally', async () => {
      mockNotificationRecipientsService.getRecipients.mockRejectedValue(
        new Error('recipients blew up')
      );

      await expect(
        service.notifyConversationMessage(directParams())
      ).resolves.toBeUndefined();
    });
  });

  describe('arming (FR-011/FR-011a — four independent tracks per recipient)', () => {
    it('arms the direct email track for each email recipient and the direct push track for each push recipient', async () => {
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [recipientUser('user-b')],
        inAppRecipients: [],
        pushRecipients: [recipientUser('user-b'), recipientUser('user-c')],
      });

      await service.notifyConversationMessage(directParams());

      expect(armedTracks()).toEqual(
        expect.arrayContaining([
          {
            channel: 'email',
            kind: 'direct',
            userId: 'user-b',
            conversationId: 'conv-1',
          },
          {
            channel: 'push',
            kind: 'direct',
            userId: 'user-b',
            conversationId: 'conv-1',
          },
          {
            channel: 'push',
            kind: 'direct',
            userId: 'user-c',
            conversationId: 'conv-1',
          },
        ])
      );
      expect(mockDigestSchedulerService.arm).toHaveBeenCalledTimes(3);
    });

    it('routes a group room onto the GROUP tracks and looks up the GROUP event settings (Ruling R1)', async () => {
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [recipientUser('user-b')],
        inAppRecipients: [],
        pushRecipients: [],
      });

      await service.notifyConversationMessage(
        directParams({
          room: { type: RoomType.CONVERSATION_GROUP, displayName: 'Alpha' },
          memberActorIds: ['sender-1', 'user-b', 'user-c'],
        })
      );

      expect(
        mockNotificationRecipientsService.getRecipients
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: NotificationEvent.USER_CONVERSATION_MESSAGE_GROUP,
        })
      );
      expect(armedTracks()).toEqual([
        {
          channel: 'email',
          kind: 'group',
          userId: 'user-b',
          conversationId: 'conv-1',
        },
      ]);
    });

    it('honours each member´s OWN channel decision (US2-AS5) — a push-only member gets no email track', async () => {
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [recipientUser('user-b')],
        inAppRecipients: [],
        pushRecipients: [recipientUser('user-c')],
      });

      await service.notifyConversationMessage(
        directParams({
          room: { type: RoomType.CONVERSATION_GROUP, displayName: 'Alpha' },
          memberActorIds: ['sender-1', 'user-b', 'user-c'],
        })
      );

      expect(armedTracks()).toEqual(
        expect.arrayContaining([
          {
            channel: 'email',
            kind: 'group',
            userId: 'user-b',
            conversationId: 'conv-1',
          },
          {
            channel: 'push',
            kind: 'group',
            userId: 'user-c',
            conversationId: 'conv-1',
          },
        ])
      );
      expect(mockDigestSchedulerService.arm).toHaveBeenCalledTimes(2);
    });

    it('arms nothing when the recipient has both channels off', async () => {
      await service.notifyConversationMessage(directParams());

      expect(mockDigestSchedulerService.arm).not.toHaveBeenCalled();
    });
  });

  describe('legacy CONVERSATION room classification (US4-AS3, Ruling R2)', () => {
    it('a legacy 2-member room arms the DIRECT tracks', async () => {
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [recipientUser('user-b')],
        inAppRecipients: [],
        pushRecipients: [],
      });

      await service.notifyConversationMessage(
        directParams({
          room: { type: RoomType.CONVERSATION, displayName: '' },
          memberActorIds: ['sender-1', 'user-b'],
        })
      );

      expect(armedTracks()[0].kind).toBe('direct');
    });

    it('a legacy 3-member room arms the GROUP tracks', async () => {
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [recipientUser('user-b')],
        inAppRecipients: [],
        pushRecipients: [],
      });

      await service.notifyConversationMessage(
        directParams({
          room: { type: RoomType.CONVERSATION, displayName: '' },
          memberActorIds: ['sender-1', 'user-b', 'user-c'],
        })
      );

      expect(armedTracks()[0].kind).toBe('group');
    });
  });

  describe('R4 — the arrival path SENDS nothing', () => {
    it('performs no unread check, no template render and no dispatch, only Redis writes', async () => {
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [recipientUser('user-b')],
        inAppRecipients: [],
        pushRecipients: [recipientUser('user-b')],
      });

      await service.notifyConversationMessage(directParams());

      // The class no longer holds a reference to either dispatch adapter or
      // to the URL generator — this is the structural half of the assertion
      // that arrival cannot send.
      expect(service).not.toHaveProperty('notificationExternalAdapter');
      expect(service).not.toHaveProperty('notificationPushAdapter');
      expect(service).not.toHaveProperty('urlGeneratorService');
      expect(mockDigestSchedulerService.arm).toHaveBeenCalledTimes(2);
    });
  });

  describe('FR-020 — bounded recipient lookup', () => {
    it('batches a conversation larger than the input bound rather than failing', async () => {
      const memberActorIds = [
        'sender-1',
        ...Array.from({ length: 250 }, (_, i) => `user-${i}`),
      ];
      mockNotificationRecipientsService.getRecipients.mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients: [],
      });

      await service.notifyConversationMessage(
        directParams({
          room: { type: RoomType.CONVERSATION_GROUP, displayName: 'Big' },
          memberActorIds,
        })
      );

      // 250 recipients / 100 per batch = 3 calls, each within the bound.
      expect(
        mockNotificationRecipientsService.getRecipients
      ).toHaveBeenCalledTimes(3);
      for (const [input] of mockNotificationRecipientsService.getRecipients.mock
        .calls) {
        expect(input.userIDs.length).toBeLessThanOrEqual(100);
      }
    });
  });
});
