import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { InputCreatorResolverQueries } from './input.creator.resolver.queries';

describe('InputCreatorResolverQueries', () => {
  let resolver: InputCreatorResolverQueries;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InputCreatorResolverQueries,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<InputCreatorResolverQueries>(
      InputCreatorResolverQueries
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should return empty object from inputCreator query', async () => {
    const result = await resolver.inputCreator();
    expect(result).toBeDefined();
  });
});
