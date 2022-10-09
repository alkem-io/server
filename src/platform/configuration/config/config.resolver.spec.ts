import { Test, TestingModule } from '@nestjs/testing';
import { ConfigResolver } from './config.resolver';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('ConfigResolver', () => {
  let resolver: ConfigResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigResolver, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<ConfigResolver>(ConfigResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
