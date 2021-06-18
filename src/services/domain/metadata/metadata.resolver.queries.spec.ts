import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { MetadataResolverQueries } from './metadata.resolver.queries';

describe('MetadataResolver', () => {
  let resolver: MetadataResolverQueries;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<MetadataResolverQueries>(MetadataResolverQueries);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
