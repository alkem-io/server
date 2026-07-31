import { MessagingService } from '@domain/communication/messaging/messaging.service';
import { Test, TestingModule } from '@nestjs/testing';
import { LogContext } from '@src/common/enums';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { type Mocked } from 'vitest';
import { MeConversationsResolverFields } from './me.conversations.resolver.fields';

describe('MeConversationsResolverFields', () => {
  let resolver: MeConversationsResolverFields;
  let messagingService: Mocked<MessagingService>;
  let module: TestingModule;

  beforeEach(async () => {
    vi.restoreAllMocks();

    module = await Test.createTestingModule({
      providers: [
        MeConversationsResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<MeConversationsResolverFields>(
      MeConversationsResolverFields
    );
    messagingService = module.get(MessagingService) as Mocked<MessagingService>;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should return an empty array when actorID is missing for conversations, without throwing', async () => {
    const actorContext = { actorID: '' } as any;

    const result = await resolver.conversations(actorContext, {} as any);

    expect(result).toEqual([]);
  });

  it('should emit a verbose log when degrading conversations to its empty value', async () => {
    // Verbose, not warn: an empty actorID is the ordinary state for every
    // anonymous visitor, and the SPA queries `me` on essentially every page
    // load. At WARN this is pure alert noise for an expected condition.
    const logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
    const actorContext = { actorID: '' } as any;

    await resolver.conversations(actorContext, {} as any);

    expect(logger.verbose).toHaveBeenCalledTimes(1);
    expect(logger.verbose).toHaveBeenCalledWith(
      expect.stringContaining('me.conversations.conversations'),
      LogContext.AUTH
    );
  });

  it('should not call the messaging service when actorID is missing for conversations', async () => {
    const actorContext = { actorID: '' } as any;

    await resolver.conversations(actorContext, {} as any);

    expect(messagingService.getPlatformMessaging).not.toHaveBeenCalled();
    expect(messagingService.getConversationsForActor).not.toHaveBeenCalled();
  });

  it('should still delegate to the messaging service when authenticated', async () => {
    const actorContext = { actorID: 'user-123' } as any;
    messagingService.getPlatformMessaging.mockResolvedValue({
      id: 'platform-messaging-id',
    } as any);
    messagingService.getConversationsForActor.mockResolvedValue([
      { id: 'conversation-1' },
    ] as any);

    const result = await resolver.conversations(actorContext, {} as any);

    expect(messagingService.getPlatformMessaging).toHaveBeenCalledTimes(1);
    expect(messagingService.getConversationsForActor).toHaveBeenCalledWith(
      'platform-messaging-id',
      'user-123'
    );
    expect(result).toEqual([{ id: 'conversation-1' }]);
  });
});
