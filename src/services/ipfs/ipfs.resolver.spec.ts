import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { IpfsResolver } from './ipfs.resolver';

describe('IpfsResolver', () => {
  let resolver: IpfsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<IpfsResolver>(IpfsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
