import { Test, TestingModule } from '@nestjs/testing';
import { CherrytwistConfigResolver } from './cherrytwist-config.resolver';

describe('CherrytwistConfigResolver', () => {
  let resolver: CherrytwistConfigResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CherrytwistConfigResolver],
    }).compile();

    resolver = module.get<CherrytwistConfigResolver>(CherrytwistConfigResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
