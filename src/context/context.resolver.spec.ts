import { Test, TestingModule } from '@nestjs/testing';
import { ContextResolver } from './context.resolver';

describe('ContextResolver', () => {
  let resolver: ContextResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContextResolver],
    }).compile();

    resolver = module.get<ContextResolver>(ContextResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
