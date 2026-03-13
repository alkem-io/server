import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { OrganizationResolverFields } from './organization.resolver.fields';

describe('OrganizationResolverFields', () => {
  let resolver: OrganizationResolverFields;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<OrganizationResolverFields>(
      OrganizationResolverFields
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
