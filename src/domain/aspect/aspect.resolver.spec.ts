import { Test, TestingModule } from '@nestjs/testing';
import { AspectResolver } from './aspect.resolver';

describe('AspectResolver', () => {
  let resolver: AspectResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AspectResolver],
    }).compile();

    resolver = module.get<AspectResolver>(AspectResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
