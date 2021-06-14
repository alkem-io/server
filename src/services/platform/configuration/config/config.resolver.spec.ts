import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { ConfigResolver } from './config.resolver';

describe('ConfigResolver', () => {
  let resolver: ConfigResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<ConfigResolver>(ConfigResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
