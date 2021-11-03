import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { UpdatesResolverMutations } from './updates.resolver.mutations';

describe('UpdatesResolverMutations', () => {
  let resolver: UpdatesResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<UpdatesResolverMutations>(UpdatesResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
