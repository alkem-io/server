import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { LicenseEngineService } from './license.engine.service';

describe('License.engineService', () => {
  let service: LicenseEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LicenseEngineService, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LicenseEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
