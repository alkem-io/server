import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { ReferenceResolverMutations } from './reference.resolver.mutations';

describe('ReferenceResolver', () => {
  let resolver: ReferenceResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<ReferenceResolverMutations>(
      ReferenceResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
