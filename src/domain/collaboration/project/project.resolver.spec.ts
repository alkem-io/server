import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { ProjectResolverMutations } from './project.resolver.mutations';

describe('ProjectResolver', () => {
  let resolver: ProjectResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<ProjectResolverMutations>(ProjectResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
