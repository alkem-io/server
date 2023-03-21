import { Test, TestingModule } from '@nestjs/testing';
import { ProfileResolverMutations } from './profile.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('Profile3Resolver', () => {
  let resolver: ProfileResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<ProfileResolverMutations>(ProfileResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
