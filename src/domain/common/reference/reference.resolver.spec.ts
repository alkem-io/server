import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { ReferenceResolver } from './reference.resolver';

describe('ReferenceResolver', () => {
  let resolver: ReferenceResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<ReferenceResolver>(ReferenceResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
