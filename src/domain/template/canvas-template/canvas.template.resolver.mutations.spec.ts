import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { CanvasTemplateResolverMutations } from './canvas.template.resolver.mutations';

describe('CanvasTemplateResolverMutations', () => {
  let resolver: CanvasTemplateResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<CanvasTemplateResolverMutations>(
      CanvasTemplateResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
