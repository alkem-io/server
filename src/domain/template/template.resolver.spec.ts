import { Test, TestingModule } from '@nestjs/testing';
import { TemplateResolver } from './template.resolver';

describe('TemplateResolver', () => {
  let resolver: TemplateResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateResolver],
    }).compile();

    resolver = module.get<TemplateResolver>(TemplateResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
