import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { ContextResolverMutations } from './agentresolver.mutations';

describe('ContextResolver', () => {
  let resolver: ContextResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<ContextResolverMutations>(ContextResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
