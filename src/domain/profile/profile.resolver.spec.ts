import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { ProfileResolver } from './profile.resolver';

describe('Profile3Resolver', () => {
  let resolver: ProfileResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<ProfileResolver>(ProfileResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
