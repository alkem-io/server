import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationResolverMutations } from './organization.resolver.mutations';
import { ModuleMocker, MockFunctionMetadata } from 'jest-mock';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';

const moduleMocker = new ModuleMocker(global);

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
      .useMocker(token => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(
            token
          ) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    resolver = module.get<OrganizationResolverMutations>(
      OrganizationResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
