import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { OrganizationResolverMutations } from './organization.resolver.mutations';

describe('OrganizationResolver', () => {
  let resolver: OrganizationResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<OrganizationResolverMutations>(
      OrganizationResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
