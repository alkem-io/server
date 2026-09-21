import { ForbiddenException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { ProxySurfaceUsageService } from '../proxy-surface/proxy.surface.usage.service';
import { ConversationEventResolverSubscription } from './conversation.resolver.subscription';

describe('ConversationEventResolverSubscription', () => {
  let resolver: ConversationEventResolverSubscription;
  let subscriptionService: Mocked<SubscriptionReadService>;
  let proxySurfaceUsage: Mocked<ProxySurfaceUsageService>;
  const context = { req: { headers: {} } } as any;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversationEventResolverSubscription, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    resolver = module.get(ConversationEventResolverSubscription);
    subscriptionService = module.get(SubscriptionReadService);
    proxySurfaceUsage = module.get(ProxySurfaceUsageService);
  });

  it('counts the legacy mixed-channel registration once, without a room kind', async () => {
    const iterator = {} as any;
    subscriptionService.subscribeToConversationEvents.mockReturnValue(iterator);

    const result = await resolver.conversationEvents(
      { actorID: 'a' } as any,
      context
    );

    expect(result).toBe(iterator);
    expect(proxySurfaceUsage.record).toHaveBeenCalledTimes(1);
    expect(proxySurfaceUsage.record).toHaveBeenCalledWith({
      surface: 'Subscription.conversationEvents',
      req: context.req,
    });
  });

  it('refuses an unresolved actor and counts nothing', async () => {
    await expect(
      resolver.conversationEvents({ actorID: '' } as any, context)
    ).rejects.toThrow(ForbiddenException);
    expect(proxySurfaceUsage.record).not.toHaveBeenCalled();
  });
});
