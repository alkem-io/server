import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { OrganisationResolverMutations } from './organisation.resolver.mutations';

describe('OrganisationResolver', () => {
  let resolver: OrganisationResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<OrganisationResolverMutations>(
      OrganisationResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
