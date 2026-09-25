import { RoomType } from '@common/enums/room.type';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { ProxySurfaceUsageService } from '../proxy-surface/proxy.surface.usage.service';
import { RoomEventResolverSubscription } from './room.event.resolver.subscription';
import { RoomService } from './room.service';

describe('RoomEventResolverSubscription', () => {
  let resolver: RoomEventResolverSubscription;
  let roomService: Mocked<RoomService>;
  let authorizationService: Mocked<AuthorizationService>;
  let subscriptionService: Mocked<SubscriptionReadService>;
  let proxySurfaceUsage: Mocked<ProxySurfaceUsageService>;

  const actorContext = { actorID: 'user-1' } as any;
  const context = { req: { headers: {} } } as any;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomEventResolverSubscription, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    resolver = module.get(RoomEventResolverSubscription);
    roomService = module.get(RoomService);
    authorizationService = module.get(AuthorizationService);
    subscriptionService = module.get(SubscriptionReadService);
    proxySurfaceUsage = module.get(ProxySurfaceUsageService);
  });

  it('counts the registration once with the subscribed room kind, after authorization', async () => {
    roomService.getRoomOrFail.mockResolvedValue({
      id: 'room-1',
      type: RoomType.CONVERSATION_DIRECT,
      authorization: {},
    } as any);
    authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);
    const iterator = {} as any;
    subscriptionService.subscribeToRoomEvents.mockReturnValue(iterator);

    const result = await resolver.roomEvents(
      actorContext,
      { roomID: 'room-1' } as any,
      context
    );

    expect(result).toBe(iterator);
    expect(proxySurfaceUsage.record).toHaveBeenCalledTimes(1);
    expect(proxySurfaceUsage.record).toHaveBeenCalledWith({
      surface: 'Subscription.roomEvents',
      roomType: RoomType.CONVERSATION_DIRECT,
      req: context.req,
    });
  });

  it('does not count a registration that is denied', async () => {
    roomService.getRoomOrFail.mockResolvedValue({
      id: 'room-1',
      type: RoomType.CALLOUT,
    } as any);
    authorizationService.grantAccessOrFail.mockImplementation(() => {
      throw new Error('denied');
    });

    await expect(
      resolver.roomEvents(actorContext, { roomID: 'room-1' } as any, context)
    ).rejects.toThrow('denied');
    expect(proxySurfaceUsage.record).not.toHaveBeenCalled();
  });
});
