import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { SearchResolver } from './search.resolver';

describe('SearchResolver', () => {
  let resolver: SearchResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<SearchResolver>(SearchResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
