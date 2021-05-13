import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { EcosystemModelResolverMutations } from './ecosystem-model.resolver.mutations';

describe('EcosystemModelResolver', () => {
  let resolver: EcosystemModelResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<EcosystemModelResolverMutations>(
      EcosystemModelResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
