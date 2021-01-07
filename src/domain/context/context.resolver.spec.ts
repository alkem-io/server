import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { ContextResolver } from './context.resolver';

describe('ContextResolver', () => {
  let resolver: ContextResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<ContextResolver>(ContextResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
