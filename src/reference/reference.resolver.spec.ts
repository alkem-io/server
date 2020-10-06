import { Test, TestingModule } from '@nestjs/testing';
import { ReferenceResolver } from './reference.resolver';

describe('ReferenceResolver', () => {
  let resolver: ReferenceResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReferenceResolver],
    }).compile();

    resolver = module.get<ReferenceResolver>(ReferenceResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
