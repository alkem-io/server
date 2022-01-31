import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { VisualResolverMutations } from './visual.resolver.mutations';

describe('VisualResolver', () => {
  let resolver: VisualResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<VisualResolverMutations>(VisualResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
