import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationRoleService } from './organization.role.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { Organization } from '../organization/organization.entity';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';

describe('OrganizationRoleService', () => {
  let service: OrganizationRoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationRoleService,
        repositoryProviderMockFactory(Organization),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<OrganizationRoleService>(OrganizationRoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
