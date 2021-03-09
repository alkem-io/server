import { Test, TestingModule } from '@nestjs/testing';
import { AgreementResolver } from './agreement.resolver';

describe('AgreementResolver', () => {
  let resolver: AgreementResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgreementResolver],
    }).compile();

    resolver = module.get<AgreementResolver>(AgreementResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
