import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { MembershipResolverQueries } from './membership.resolver.queries';

describe('MembershipResolverQueries', () => {
  let resolver: MembershipResolverQueries;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<MembershipResolverQueries>(MembershipResolverQueries);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
