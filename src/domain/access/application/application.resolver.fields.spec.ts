import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { ApplicationResolverFields } from './application.resolver.fields';
import { ApplicationService } from './application.service';

describe('ApplicationResolverFields', () => {
  let resolver: ApplicationResolverFields;
  let applicationService: ApplicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<ApplicationResolverFields>(ApplicationResolverFields);
    applicationService = module.get<ApplicationService>(ApplicationService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('actor', () => {
    it('should delegate to applicationService.getActor', async () => {
      const mockUser = { id: 'user-1' } as any;
      const mockApplication = { id: 'app-1' } as any;
      (applicationService.getActor as Mock).mockResolvedValue(mockUser);

      const result = await resolver.actor(mockApplication);

      expect(result).toBe(mockUser);
      expect(applicationService.getActor).toHaveBeenCalledWith('app-1');
    });
  });

  describe('questions', () => {
    it('should delegate to applicationService.getQuestionsSorted', async () => {
      const mockQuestions = [{ id: 'q-1' }] as any;
      const mockApplication = { id: 'app-1' } as any;
      (applicationService.getQuestionsSorted as Mock).mockResolvedValue(
        mockQuestions
      );

      const result = await resolver.questions(mockApplication);

      expect(result).toBe(mockQuestions);
      expect(applicationService.getQuestionsSorted).toHaveBeenCalledWith(
        mockApplication
      );
    });
  });
});
