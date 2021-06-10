import { Test, TestingModule } from '@nestjs/testing';
import { MetadataModule } from './metadata.module';
import { MetadataResolverQueries } from './metadata.resolver.queries';
import { MetadataService } from './metadata.service';

describe('MetadataResolver', () => {
  let resolver: MetadataResolverQueries;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [MetadataModule],
      providers: [MetadataResolverQueries, MetadataService],
    }).compile();

    resolver = module.get<MetadataResolverQueries>(MetadataResolverQueries);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
