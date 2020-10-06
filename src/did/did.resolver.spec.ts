import { Test, TestingModule } from '@nestjs/testing';
import { DidResolver } from './did.resolver';

describe('DidResolver', () => {
  let resolver: DidResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DidResolver],
    }).compile();

    resolver = module.get<DidResolver>(DidResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
