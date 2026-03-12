import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { VirtualContributorResolverFields } from './virtual.contributor.resolver.fields';

describe('VirtualContributorResolverFields', () => {
  let resolver: VirtualContributorResolverFields;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualContributorResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<VirtualContributorResolverFields>(
      VirtualContributorResolverFields
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
