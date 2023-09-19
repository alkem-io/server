import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CalloutTemplateResolverMutations } from './callout.template.resolver.mutations';

describe('CalloutTemplateResolverMutations', () => {
  let resolver: CalloutTemplateResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutTemplateResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(CalloutTemplateResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
