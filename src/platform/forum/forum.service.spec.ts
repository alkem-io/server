import { Test, TestingModule } from '@nestjs/testing';
import { ForumService } from './forum.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { Forum } from './forum.entity';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';

describe('ForumService', () => {
  let service: ForumService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForumService,
        MockWinstonProvider,
        repositoryProviderMockFactory(Forum),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<ForumService>(ForumService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
