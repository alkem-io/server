import { ActorModule } from '@domain/actor/actor.module';
import { ProfileModule } from '@domain/profile/profile.module';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { ActorGroupResolver } from './actor-group.resolver';

describe('ActorGroupResolver', () => {
  let resolver: ActorGroupResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<ActorGroupResolver>(ActorGroupResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
