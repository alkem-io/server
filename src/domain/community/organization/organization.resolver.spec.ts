import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { OrganizationResolverMutations } from './organization.resolver.mutations';

describe('OrganizationResolver', () => {
  let resolver: OrganizationResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<OrganizationResolverMutations>(
      OrganizationResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
