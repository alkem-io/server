import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { CommunityRoleService } from './community.role.service';
import { Community } from '../community/community.entity';

describe('CommunityRoleService', () => {
  let service: CommunityRoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityRoleService,
        repositoryProviderMockFactory(Community),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<CommunityRoleService>(CommunityRoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
