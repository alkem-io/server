import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { TagsetResolver } from './tagset.resolver';

describe('TagsetResolver', () => {
  let resolver: TagsetResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<TagsetResolver>(TagsetResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
