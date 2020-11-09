import { Test, TestingModule } from '@nestjs/testing';
import { RelationResolver } from './relation.resolver';

describe('RelationResolver', () => {
  let resolver: RelationResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RelationResolver],
    }).compile();

    resolver = module.get<RelationResolver>(RelationResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
