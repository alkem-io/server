import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { ActorResolver } from './actor.resolver';

describe('ActorResolver', () => {
  let resolver: ActorResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<ActorResolver>(ActorResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
