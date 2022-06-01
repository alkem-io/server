import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { RolesResolverQueries } from './roles.resolver.queries';

describe('RolesResolverQueries', () => {
  let resolver: RolesResolverQueries;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<RolesResolverQueries>(RolesResolverQueries);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
