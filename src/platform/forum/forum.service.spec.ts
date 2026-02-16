import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { ForumService } from './forum.service';

describe('ForumService', () => {
  let service: ForumService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForumService,
        MockWinstonProvider,
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
