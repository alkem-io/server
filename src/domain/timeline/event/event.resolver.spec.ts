import { Test, TestingModule } from '@nestjs/testing';
import { CalendarEventResolverMutations } from './event.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('CalendarEventResolver', () => {
  let resolver: CalendarEventResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarEventResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(CalendarEventResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
