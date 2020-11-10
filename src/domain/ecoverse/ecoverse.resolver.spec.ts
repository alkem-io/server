import { Test, TestingModule } from '@nestjs/testing';
import { EcoverseResolver } from './ecoverse.resolver';

describe('EcoverseResolver', () => {
  let resolver: EcoverseResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EcoverseResolver],
    }).compile();

    resolver = module.get<EcoverseResolver>(EcoverseResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
