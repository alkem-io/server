import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { LifecycleResolverFields } from './lifecycle.resolver.fields';

describe('LifecycleResolverFields', () => {
  let resolver: LifecycleResolverFields;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<LifecycleResolverFields>(LifecycleResolverFields);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
