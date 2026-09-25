import { ForbiddenException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import {
  ConversationGovernanceResolverSubscription,
  isGovernanceEventForActor,
  toConversationGovernanceEvent,
} from './conversation.governance.resolver.subscription';

describe('ConversationGovernanceResolverSubscription', () => {
  let resolver: ConversationGovernanceResolverSubscription;
  let subscriptionService: Mocked<SubscriptionReadService>;

  const payload = (memberActorIds: string[], event: Record<string, unknown>) =>
    ({ eventID: 'e-1', memberActorIds, event }) as any;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationGovernanceResolverSubscription,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    resolver = module.get(ConversationGovernanceResolverSubscription);
    subscriptionService = module.get(SubscriptionReadService);
  });

  it('subscribes on the governance trigger for a resolved actor', async () => {
    const iterator = {} as any;
    subscriptionService.subscribeToConversationGovernanceEvents.mockReturnValue(
      iterator
    );

    const result = await resolver.conversationGovernanceEvents({
      actorID: 'a',
    } as any);

    expect(result).toBe(iterator);
    expect(
      subscriptionService.subscribeToConversationEvents
    ).not.toHaveBeenCalled();
  });

  it('refuses an unresolved actor', async () => {
    await expect(
      resolver.conversationGovernanceEvents({ actorID: '' } as any)
    ).rejects.toThrow(ForbiddenException);
  });

  describe('delivery rule', () => {
    it('delivers to members', () => {
      expect(
        isGovernanceEventForActor(
          payload(['a', 'b'], { eventType: 'MEMBER_ADDED' }),
          'a'
        )
      ).toBe(true);
    });

    it('delivers nothing to non-members', () => {
      expect(
        isGovernanceEventForActor(
          payload(['a', 'b'], { eventType: 'MEMBER_ADDED' }),
          'd'
        )
      ).toBe(false);
    });

    it('delivers a removal to the removed member (captured in the member set)', () => {
      expect(
        isGovernanceEventForActor(
          payload(['a', 'c'], { eventType: 'MEMBER_REMOVED', memberID: 'c' }),
          'c'
        )
      ).toBe(true);
    });

    it('rejects when no user context is present', () => {
      expect(isGovernanceEventForActor(payload(['a'], {}), undefined)).toBe(
        false
      );
    });
  });

  describe('projection', () => {
    it('rehydrates dates and projects readiness; never emits message fields', () => {
      const resolved = toConversationGovernanceEvent(
        payload(['a'], {
          eventType: 'ROOM_READINESS_CHANGED',
          conversationID: 'conv-1',
          conversation: {
            id: 'conv-1',
            createdDate: '2026-01-01T00:00:00.000Z',
            updatedDate: '2026-01-02T00:00:00.000Z',
            room: {
              id: 'room-1',
              createdDate: '2026-01-01T00:00:00.000Z',
              updatedDate: '2026-01-02T00:00:00.000Z',
            },
          },
          readiness: {
            state: 'READY',
            reason: 'VERIFIED',
            updatedAt: '2026-01-03T00:00:00.000Z',
          },
        })
      );

      expect(resolved.conversation?.createdDate).toBeInstanceOf(Date);
      expect(resolved.conversation?.room.updatedDate).toBeInstanceOf(Date);
      expect(resolved.readiness).toEqual({
        state: 'READY',
        reason: 'VERIFIED',
        detail: undefined,
        updatedDate: new Date('2026-01-03T00:00:00.000Z'),
      });
      expect(Object.keys(resolved).sort()).toEqual(
        [
          'conversation',
          'conversationID',
          'eventType',
          'member',
          'memberID',
          'readiness',
        ].sort()
      );
    });

    it('leaves conversation undefined for a deletion', () => {
      const resolved = toConversationGovernanceEvent(
        payload(['a'], {
          eventType: 'CONVERSATION_DELETED',
          conversationID: 'conv-1',
        })
      );
      expect(resolved.conversation).toBeUndefined();
      expect(resolved.conversationID).toBe('conv-1');
    });
  });
});
