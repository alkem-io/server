import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { AspectTemplateResolverMutations } from './aspect.template.resolver.mutations';

describe('AspectTemplateResolverMutations', () => {
  let resolver: AspectTemplateResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<AspectTemplateResolverMutations>(
      AspectTemplateResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
