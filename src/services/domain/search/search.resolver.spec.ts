import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { SearchResolverQueries } from './search.resolver.queries';

describe('SearchResolver', () => {
  let resolver: SearchResolverQueries;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<SearchResolverQueries>(SearchResolverQueries);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
