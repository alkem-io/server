import { Test, TestingModule } from '@nestjs/testing';
import { OrganisationResolver } from './organisation.resolver';

describe('OrganisationResolver', () => {
  let resolver: OrganisationResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganisationResolver],
    }).compile();

    resolver = module.get<OrganisationResolver>(OrganisationResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
