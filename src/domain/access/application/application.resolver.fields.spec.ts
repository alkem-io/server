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
    vi.restoreAllMocks();

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

  describe('user', () => {
    it('S1 delegation — should return the user from applicationService.getUser and call it with application.id', async () => {
      const mockUser = { id: 'user-1' } as any;
      const mockApplication = { id: 'app-1' } as any;
      (applicationService.getUser as Mock).mockResolvedValue(mockUser);

      const result = await resolver.user(mockApplication);

      expect(result).toBe(mockUser);
      expect(applicationService.getUser).toHaveBeenCalledWith('app-1');
    });

    it('S2 null-on-missing — should return null without throwing when service resolves null', async () => {
      const mockApplication = { id: 'app-1' } as any;
      (applicationService.getUser as Mock).mockResolvedValue(null);

      const result = await resolver.user(mockApplication);

      expect(result).toBeNull();
      expect(applicationService.getUser).toHaveBeenCalledWith('app-1');
    });
  });
});
