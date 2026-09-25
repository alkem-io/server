import { RoomType } from '@common/enums/room.type';
import { RoomReadinessChangedEvent } from '@domain/communication/room/room.readiness.changed.event';
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { ConversationReadinessGovernanceListener } from './conversation.readiness.governance.listener';
import { ConversationService } from './conversation.service';

describe('ConversationReadinessGovernanceListener', () => {
  let listener: ConversationReadinessGovernanceListener;
  let conversationService: Mocked<ConversationService>;
  let publish: Mocked<SubscriptionPublishService>;

  const room = (type: RoomType) => ({ id: 'room-1', type }) as any;
  const failed = {
    state: 'FAILED',
    reason: 'ADAPTER_TIMEOUT',
    updatedAt: 't1',
  } as any;
  const ready = {
    state: 'READY',
    reason: 'PROVISIONED',
    updatedAt: 't2',
  } as any;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversationReadinessGovernanceListener, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    listener = module.get(ConversationReadinessGovernanceListener);
    conversationService = module.get(ConversationService);
    publish = module.get(SubscriptionPublishService);
  });

  it('publishes one ROOM_READINESS_CHANGED to the members of the owning conversation', async () => {
    const conversation = {
      id: 'conv-1',
      room: room(RoomType.CONVERSATION_DIRECT),
    } as any;
    conversationService.findConversationByRoomId.mockResolvedValue(
      conversation
    );
    conversationService.getConversationMemberActorIds.mockResolvedValue([
      'a',
      'b',
    ]);

    await listener.handleReadinessChanged(
      new RoomReadinessChangedEvent(
        room(RoomType.CONVERSATION_DIRECT),
        failed,
        ready,
        'PROBE'
      )
    );

    expect(publish.publishConversationGovernanceEvent).toHaveBeenCalledTimes(1);
    expect(publish.publishConversationGovernanceEvent).toHaveBeenCalledWith(
      ['a', 'b'],
      {
        eventType: 'ROOM_READINESS_CHANGED',
        conversationID: 'conv-1',
        conversation,
        readiness: ready,
      }
    );
  });

  it('publishes nothing for a room that belongs to no conversation (a callout room)', async () => {
    conversationService.findConversationByRoomId.mockResolvedValue(null);

    await listener.handleReadinessChanged(
      new RoomReadinessChangedEvent(
        room(RoomType.CALLOUT),
        failed,
        ready,
        'PROBE'
      )
    );

    expect(publish.publishConversationGovernanceEvent).not.toHaveBeenCalled();
  });

  it('publishes nothing for the creation-time write, whose previous record is the column default', async () => {
    const columnDefault = {
      state: 'UNKNOWN',
      reason: 'LEGACY_UNVERIFIED',
      updatedAt: '2026-09-21T00:00:00.000Z',
    } as any;

    await listener.handleReadinessChanged(
      new RoomReadinessChangedEvent(
        room(RoomType.CONVERSATION_DIRECT),
        columnDefault,
        failed,
        'PROVISIONING'
      )
    );

    expect(conversationService.findConversationByRoomId).not.toHaveBeenCalled();
    expect(publish.publishConversationGovernanceEvent).not.toHaveBeenCalled();
  });

  it('publishes nothing when the conversation has no persisted memberships yet', async () => {
    conversationService.findConversationByRoomId.mockResolvedValue({
      id: 'conv-1',
    } as any);
    conversationService.getConversationMemberActorIds.mockResolvedValue([]);

    await listener.handleReadinessChanged(
      new RoomReadinessChangedEvent(
        room(RoomType.CONVERSATION_GROUP),
        failed,
        ready,
        'PROBE'
      )
    );

    expect(publish.publishConversationGovernanceEvent).not.toHaveBeenCalled();
  });
});
