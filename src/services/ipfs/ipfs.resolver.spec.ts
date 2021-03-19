import { Test, TestingModule } from '@nestjs/testing';
import { IpfsResolver } from './ipfs.resolver';

describe('IpfsResolver', () => {
  let resolver: IpfsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IpfsResolver],
    }).compile();

    resolver = module.get<IpfsResolver>(IpfsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
