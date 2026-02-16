import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { LifecycleService } from './lifecycle.service';

describe('LifecycleService', () => {
  let service: LifecycleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifecycleService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LifecycleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
