import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { EcosystemModelResolverMutations } from './ecosystem-model.resolver.mutations';

describe('EcosystemModelResolver', () => {
  let resolver: EcosystemModelResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EcosystemModelResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(EcosystemModelResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
