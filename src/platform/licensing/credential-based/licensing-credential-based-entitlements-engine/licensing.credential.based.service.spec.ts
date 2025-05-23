import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { LicensingCredentialBasedService } from './licensing.credential.based.service';

describe('LicensingCredentialBased.Service', () => {
  let service: LicensingCredentialBasedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicensingCredentialBasedService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LicensingCredentialBasedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
