import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { AspectResolverMutations } from './aspect.resolver.mutations';

describe('AspectResolver', () => {
  let resolver: AspectResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<AspectResolverMutations>(AspectResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
