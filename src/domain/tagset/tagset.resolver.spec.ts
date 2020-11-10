import { Test, TestingModule } from '@nestjs/testing';
import { TagsetResolver } from './tagset.resolver';

describe('TagsetResolver', () => {
  let resolver: TagsetResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TagsetResolver],
    }).compile();

    resolver = module.get<TagsetResolver>(TagsetResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
