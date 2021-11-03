import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { CommunicationResolverMutations } from './communication.resolver.mutations';

describe('CommunicationResolver', () => {
  let resolver: CommunicationResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<CommunicationResolverMutations>(
      CommunicationResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
