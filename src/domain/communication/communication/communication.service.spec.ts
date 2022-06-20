import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationService } from './communication.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { Communication } from './communication.entity';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';

describe('CommunicationService', () => {
  let service: CommunicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationService,
        MockWinstonProvider,
        repositoryProviderMockFactory(Communication),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<CommunicationService>(CommunicationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
