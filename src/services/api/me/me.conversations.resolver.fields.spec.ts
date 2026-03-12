import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MeConversationsResolverFields } from './me.conversations.resolver.fields';

describe('MeConversationsResolverFields', () => {
  let resolver: MeConversationsResolverFields;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should throw when actorID is missing for users', async () => {
    const actorContext = { actorID: '' } as any;
    await expect(resolver.users(actorContext, {} as any)).rejects.toThrow();
  });

  it('should throw when actorID is missing for virtualContributors', async () => {
    const actorContext = { actorID: '' } as any;
    await expect(
      resolver.virtualContributors(actorContext, {} as any)
    ).rejects.toThrow();
  });

  it('should throw when actorID is missing for virtualContributor', async () => {
    const actorContext = { actorID: '' } as any;
    await expect(
      resolver.virtualContributor(actorContext, {} as any, 'PLATFORM' as any)
    ).rejects.toThrow();
  });
});
