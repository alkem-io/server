import { Test, TestingModule } from '@nestjs/testing';
import { IpfsService } from './ipfs.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockConfigService } from '@test/mocks/config.service.mock';

describe('IpfsService', () => {
  let service: IpfsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpfsService,
        MockCacheManager,
        MockWinstonProvider,
        MockConfigService,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<IpfsService>(IpfsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
