import { Test, TestingModule } from '@nestjs/testing';
import { AgreementResolver } from './agreement.resolver';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('AgreementResolver', () => {
  let resolver: AgreementResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgreementResolver,
        MockCacheManager,
        MockWinstonProvider,
        MockNotificationsService,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<AgreementResolver>(AgreementResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
