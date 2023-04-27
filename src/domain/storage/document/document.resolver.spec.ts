import { Test, TestingModule } from '@nestjs/testing';
import { DocumentResolverMutations } from './document.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('DocumentResolver', () => {
  let resolver: DocumentResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(DocumentResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
