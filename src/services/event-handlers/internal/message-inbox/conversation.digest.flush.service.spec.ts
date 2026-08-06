import { NotificationEvent } from '@common/enums/notification.event';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { ConversationService } from '@domain/communication/conversation/conversation.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { NotificationExternalAdapter } from '@services/adapters/notification-external-adapter/notification.external.adapter';
import { NotificationPushAdapter } from '@services/adapters/notification-push-adapter/notification.push.adapter';
import { NotificationRecipientsService } from '@services/api/notification-recipients/notification.recipients.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationDigestFlushService } from './conversation.digest.flush.service';
import { ConversationDigestSchedulerService } from './conversation.digest.scheduler.service';

const RECIPIENT_ID = 'user-1';
const EMAIL_TRACK = `email:direct:${RECIPIENT_ID}`;
const PUSH_TRACK = `push:direct:${RECIPIENT_ID}`;
const GROUP_EMAIL_TRACK = `email:group:${RECIPIENT_ID}`;

const recipient = {
  id: RECIPIENT_ID,
  email: 'user-1@test.com',
  nameID: 'user-1',
  profile: { displayName: 'Bob' },
} as any;

const conversation = (id: string, roomId: string, displayName = '') =>
  ({ id, room: { id: roomId, displayName } }) as any;

const mockScheduler = {
  readAndClear: vi.fn(),
  reArm: vi.fn(),
  clearAttempts: vi.fn(),
};
const mockRecipients = { getRecipients: vi.fn() };
const mockConversationService = {
  getConversationsByIds: vi.fn(),
  getMemberActorIdsForConversations: vi.fn(),
};
const mockActorLookupService = { getActorDisplayNamesByIds: vi.fn() };
const mockCommunicationAdapter = { batchGetUnreadCounts: vi.fn() };
const mockExternalAdapter = {
  buildConversationMessageDirectPayload: vi.fn(),
  buildConversationMessageGroupPayload: vi.fn(),
  sendExternalNotifications: vi.fn(),
};
const mockPushAdapter = { sendMessagingPushNotifications: vi.fn() };
const mockUrlGenerator = {
  getConversationUrl: vi.fn((id: string) => `https://p.test/?chat=${id}`),
  getConversationDeepLinkPath: vi.fn((id: string) => `/?chat=${id}`),
  getChatSurfaceDeepLinkPath: vi.fn(() => '/?chat='),
};

describe('ConversationDigestFlushService (R4, data-model §5.3)', () => {
  let service: ConversationDigestFlushService;

  beforeEach(async () => {
    vi.clearAllMocks();
    // `clearAllMocks` clears CALLS but not implementations, and several tests
    // below install a rejecting/recording dispatch. Reset those explicitly so
    // one test's failure injection cannot leak into the next.
    mockExternalAdapter.sendExternalNotifications.mockReset();
    mockPushAdapter.sendMessagingPushNotifications.mockReset();

    mockScheduler.readAndClear.mockResolvedValue({
      conversationIds: ['conv-1'],
      firstAtMs: 1_000_000,
    });
    mockScheduler.reArm.mockResolvedValue(true);
    mockRecipients.getRecipients.mockResolvedValue({
      emailRecipients: [recipient],
      inAppRecipients: [],
      pushRecipients: [recipient],
    });
    mockConversationService.getConversationsByIds.mockResolvedValue([
      conversation('conv-1', 'room-1'),
    ]);
    mockConversationService.getMemberActorIdsForConversations.mockResolvedValue(
      new Map([['conv-1', [RECIPIENT_ID, 'user-2']]])
    );
    mockActorLookupService.getActorDisplayNamesByIds.mockResolvedValue(
      new Map([['user-2', 'Alice']])
    );
    mockCommunicationAdapter.batchGetUnreadCounts.mockResolvedValue({
      'room-1': 3,
    });
    mockExternalAdapter.buildConversationMessageDirectPayload.mockResolvedValue(
      { eventType: NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT }
    );
    mockExternalAdapter.buildConversationMessageGroupPayload.mockResolvedValue({
      eventType: NotificationEvent.USER_CONVERSATION_MESSAGE_GROUP,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationDigestFlushService,
        {
          provide: ConversationDigestSchedulerService,
          useValue: mockScheduler,
        },
        {
          provide: NotificationRecipientsService,
          useValue: mockRecipients,
        },
        { provide: ConversationService, useValue: mockConversationService },
        { provide: ActorLookupService, useValue: mockActorLookupService },
        { provide: CommunicationAdapter, useValue: mockCommunicationAdapter },
        {
          provide: NotificationExternalAdapter,
          useValue: mockExternalAdapter,
        },
        { provide: NotificationPushAdapter, useValue: mockPushAdapter },
        { provide: UrlGeneratorService, useValue: mockUrlGenerator },
        MockWinstonProvider,
      ],
    }).compile();

    service = module.get(ConversationDigestFlushService);
  });

  const noDispatch = () => {
    expect(
      mockExternalAdapter.sendExternalNotifications
    ).not.toHaveBeenCalled();
    expect(
      mockPushAdapter.sendMessagingPushNotifications
    ).not.toHaveBeenCalled();
  };

  describe('the fire-time unread check (FR-018 / D-19)', () => {
    it('US1-AS6: dispatches NOTHING when everything pending was already read', async () => {
      mockCommunicationAdapter.batchGetUnreadCounts.mockResolvedValue({
        'room-1': 0,
      });

      await service.flush(EMAIL_TRACK);

      noDispatch();
      expect(mockScheduler.clearAttempts).toHaveBeenCalledWith(EMAIL_TRACK);
    });

    it('US5-AS4: only the still-unread conversations appear in the digest', async () => {
      mockScheduler.readAndClear.mockResolvedValue({
        conversationIds: ['conv-1', 'conv-2'],
        firstAtMs: 1_000_000,
      });
      mockConversationService.getConversationsByIds.mockResolvedValue([
        conversation('conv-1', 'room-1'),
        conversation('conv-2', 'room-2'),
      ]);
      mockConversationService.getMemberActorIdsForConversations.mockResolvedValue(
        new Map([
          ['conv-1', [RECIPIENT_ID, 'user-2']],
          ['conv-2', [RECIPIENT_ID, 'user-3']],
        ])
      );
      mockActorLookupService.getActorDisplayNamesByIds.mockResolvedValue(
        new Map([
          ['user-2', 'Alice'],
          ['user-3', 'Carol'],
        ])
      );
      mockCommunicationAdapter.batchGetUnreadCounts.mockResolvedValue({
        'room-1': 0,
        'room-2': 2,
      });

      await service.flush(EMAIL_TRACK);

      const [, , entries] =
        mockExternalAdapter.buildConversationMessageDirectPayload.mock.calls[0];
      expect(entries).toEqual([
        {
          displayName: 'Carol',
          count: 2,
          url: 'https://p.test/?chat=conv-2',
        },
      ]);
    });

    it('costs ONE batch RPC for the whole flush, not one call per conversation', async () => {
      mockScheduler.readAndClear.mockResolvedValue({
        conversationIds: ['conv-1', 'conv-2', 'conv-3'],
        firstAtMs: 1_000_000,
      });
      mockConversationService.getConversationsByIds.mockResolvedValue([
        conversation('conv-1', 'room-1'),
        conversation('conv-2', 'room-2'),
        conversation('conv-3', 'room-3'),
      ]);
      mockConversationService.getMemberActorIdsForConversations.mockResolvedValue(
        new Map([
          ['conv-1', [RECIPIENT_ID, 'user-2']],
          ['conv-2', [RECIPIENT_ID, 'user-2']],
          ['conv-3', [RECIPIENT_ID, 'user-2']],
        ])
      );
      mockCommunicationAdapter.batchGetUnreadCounts.mockResolvedValue({
        'room-1': 1,
        'room-2': 1,
        'room-3': 1,
      });

      await service.flush(EMAIL_TRACK);

      expect(
        mockCommunicationAdapter.batchGetUnreadCounts
      ).toHaveBeenCalledTimes(1);
      expect(
        mockCommunicationAdapter.batchGetUnreadCounts
      ).toHaveBeenCalledWith(RECIPIENT_ID, ['room-1', 'room-2', 'room-3']);
    });

    it('US5-AS5: a batch RPC error fails OPEN — it sends rather than silently cancelling', async () => {
      mockCommunicationAdapter.batchGetUnreadCounts.mockRejectedValue(
        new Error('matrix-adapter down')
      );

      await service.flush(EMAIL_TRACK);

      expect(mockExternalAdapter.sendExternalNotifications).toHaveBeenCalled();
    });

    it('a room missing from the response map is treated as unread, not as read', async () => {
      mockCommunicationAdapter.batchGetUnreadCounts.mockResolvedValue({});

      await service.flush(EMAIL_TRACK);

      expect(mockExternalAdapter.sendExternalNotifications).toHaveBeenCalled();
    });
  });

  describe('FR-023 — settings are re-evaluated at fire time', () => {
    it('dispatches nothing when the channel was disabled while the timer ran', async () => {
      mockRecipients.getRecipients.mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients: [recipient],
      });

      await service.flush(EMAIL_TRACK);

      noDispatch();
      expect(
        mockCommunicationAdapter.batchGetUnreadCounts
      ).not.toHaveBeenCalled();
    });

    it('checks the PUSH list for a push track and the EMAIL list for an email track', async () => {
      mockRecipients.getRecipients.mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients: [recipient],
      });

      await service.flush(PUSH_TRACK);

      expect(mockPushAdapter.sendMessagingPushNotifications).toHaveBeenCalled();
    });

    it('looks up the settings for the event matching the track kind (Ruling R1)', async () => {
      await service.flush(GROUP_EMAIL_TRACK);

      expect(mockRecipients.getRecipients).toHaveBeenCalledWith({
        eventType: NotificationEvent.USER_CONVERSATION_MESSAGE_GROUP,
        userIDs: [RECIPIENT_ID],
      });
    });

    it('dispatches nothing when the recipient no longer resolves at all (deleted user)', async () => {
      mockRecipients.getRecipients.mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients: [],
      });

      await service.flush(EMAIL_TRACK);

      noDispatch();
    });
  });

  describe('US2-AS4 — membership and existence at fire time', () => {
    it('drops a conversation the recipient has left', async () => {
      mockConversationService.getMemberActorIdsForConversations.mockResolvedValue(
        new Map([['conv-1', ['user-2', 'user-3']]])
      );

      await service.flush(EMAIL_TRACK);

      noDispatch();
      expect(
        mockCommunicationAdapter.batchGetUnreadCounts
      ).not.toHaveBeenCalled();
    });

    it('drops a conversation that no longer exists', async () => {
      mockConversationService.getConversationsByIds.mockResolvedValue([]);

      await service.flush(EMAIL_TRACK);

      noDispatch();
    });
  });

  describe('dispatch shape', () => {
    it('email: builds the direct digest for the ONE recipient and emits the wire event', async () => {
      await service.flush(EMAIL_TRACK);

      expect(
        mockExternalAdapter.buildConversationMessageDirectPayload
      ).toHaveBeenCalledWith(
        NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT,
        recipient,
        [
          {
            displayName: 'Alice',
            count: 3,
            url: 'https://p.test/?chat=conv-1',
          },
        ]
      );
      expect(
        mockExternalAdapter.sendExternalNotifications
      ).toHaveBeenCalledWith(
        NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT,
        expect.anything()
      );
    });

    it('email entries use the platform-absolute URL (contract C-6)', async () => {
      await service.flush(EMAIL_TRACK);

      const [, , entries] =
        mockExternalAdapter.buildConversationMessageDirectPayload.mock.calls[0];
      expect(entries[0].url).toBe('https://p.test/?chat=conv-1');
    });

    it('push entries use the bare relative deep link (contract C-4)', async () => {
      await service.flush(PUSH_TRACK);

      const [, , copy] =
        mockPushAdapter.sendMessagingPushNotifications.mock.calls[0];
      expect(copy.url).toBe('/?chat=conv-1');
      expect(copy.tag).toBe('messaging-digest-direct');
      expect(copy.title).toBe('Alice');
      expect(copy.body).toBe('sent you 3 messages');
    });

    it('push goes to exactly the one recipient of this track', async () => {
      await service.flush(PUSH_TRACK);

      const [recipients] =
        mockPushAdapter.sendMessagingPushNotifications.mock.calls[0];
      expect(recipients).toEqual([recipient]);
    });

    it('a GROUP digest names conversations, not counterparts (FR-018a)', async () => {
      mockConversationService.getConversationsByIds.mockResolvedValue([
        conversation('conv-1', 'room-1', 'Project Alpha'),
      ]);

      await service.flush(GROUP_EMAIL_TRACK);

      expect(
        mockExternalAdapter.buildConversationMessageGroupPayload
      ).toHaveBeenCalledWith(
        NotificationEvent.USER_CONVERSATION_MESSAGE_GROUP,
        recipient,
        [
          {
            displayName: 'Project Alpha',
            count: 3,
            url: 'https://p.test/?chat=conv-1',
          },
        ]
      );
      // The group path never looks up who wrote.
      expect(
        mockActorLookupService.getActorDisplayNamesByIds
      ).not.toHaveBeenCalled();
    });

    it('corr-server-5: substitutes the neutral label for the internal unnamed-group placeholder', async () => {
      mockConversationService.getConversationsByIds.mockResolvedValue([
        conversation('conv-1', 'room-1', 'group-conversation-4-members'),
      ]);

      await service.flush(GROUP_EMAIL_TRACK);

      const [, , entries] =
        mockExternalAdapter.buildConversationMessageGroupPayload.mock.calls[0];
      expect(entries[0].displayName).toBe('a group chat');
    });
  });

  describe('ordering and crash safety', () => {
    it('clears the pending state BEFORE dispatching, so a crash cannot re-send', async () => {
      const order: string[] = [];
      mockScheduler.readAndClear.mockImplementation(async () => {
        order.push('readAndClear');
        return { conversationIds: ['conv-1'], firstAtMs: 1_000_000 };
      });
      mockExternalAdapter.sendExternalNotifications.mockImplementation(
        async () => {
          order.push('dispatch');
        }
      );

      await service.flush(EMAIL_TRACK);

      expect(order).toEqual(['readAndClear', 'dispatch']);
    });

    it('returns immediately when there is nothing pending', async () => {
      mockScheduler.readAndClear.mockResolvedValue({
        conversationIds: [],
        firstAtMs: null,
      });

      await service.flush(EMAIL_TRACK);

      expect(mockRecipients.getRecipients).not.toHaveBeenCalled();
      noDispatch();
    });
  });

  describe('bounded dispatch retry (§5.4)', () => {
    it('re-arms with the drained conversations and the original anchor when dispatch throws', async () => {
      mockExternalAdapter.sendExternalNotifications.mockRejectedValue(
        new Error('rabbit down')
      );

      await service.flush(EMAIL_TRACK);

      expect(mockScheduler.reArm).toHaveBeenCalledWith(
        { channel: 'email', kind: 'direct', userId: RECIPIENT_ID },
        EMAIL_TRACK,
        ['conv-1'],
        1_000_000
      );
      expect(mockScheduler.clearAttempts).not.toHaveBeenCalled();
    });

    it('drops after the retry budget is exhausted rather than looping forever', async () => {
      mockExternalAdapter.sendExternalNotifications.mockRejectedValue(
        new Error('rabbit down')
      );
      mockScheduler.reArm.mockResolvedValue(false);

      await expect(service.flush(EMAIL_TRACK)).resolves.toBeUndefined();
    });

    it('clears the attempt counter on a successful dispatch', async () => {
      await service.flush(EMAIL_TRACK);

      expect(mockScheduler.clearAttempts).toHaveBeenCalledWith(EMAIL_TRACK);
      expect(mockScheduler.reArm).not.toHaveBeenCalled();
    });
  });

  describe('robustness', () => {
    it('drops an unparseable claimed member instead of guessing at it', async () => {
      await service.flush('not-a-track');

      expect(mockScheduler.readAndClear).not.toHaveBeenCalled();
      noDispatch();
    });

    it('never throws — the sweep must survive any single track failing', async () => {
      mockConversationService.getConversationsByIds.mockRejectedValue(
        new Error('db down')
      );

      await expect(service.flush(EMAIL_TRACK)).resolves.toBeUndefined();
    });
  });

  it('US4-AS2: a messaging push never consults the shared push throttle', async () => {
    await service.flush(PUSH_TRACK);

    // The flush hands the digest to `sendMessagingPushNotifications`, which is
    // the throttle-free path (asserted in the push adapter spec). The flush
    // must never reach for the throttled `sendPushNotifications`.
    expect(mockPushAdapter).not.toHaveProperty('sendPushNotifications');
    expect(mockPushAdapter.sendMessagingPushNotifications).toHaveBeenCalled();
  });
});
