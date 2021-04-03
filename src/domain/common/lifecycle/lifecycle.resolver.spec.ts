import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { LifecycleResolver } from './lifecycle.resolver';

describe('LifecycleResolver', () => {
  let resolver: LifecycleResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<LifecycleResolver>(LifecycleResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
