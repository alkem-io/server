import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { RelationResolverMutations } from './relation.resolver.mutations';

describe('RelationResolver', () => {
  let resolver: RelationResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<RelationResolverMutations>(RelationResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
