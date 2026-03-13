import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { ApplicationResolverMutations } from './application.resolver.mutations';
import { ApplicationService } from './application.service';

describe('ApplicationResolverMutations', () => {
  let resolver: ApplicationResolverMutations;
  let applicationService: ApplicationService;
  let authorizationService: AuthorizationService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<ApplicationResolverMutations>(
      ApplicationResolverMutations
    );
    applicationService = module.get<ApplicationService>(ApplicationService);
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('deleteApplication', () => {
    it('should authorize and delete application', async () => {
      const mockApplication = {
        id: 'app-1',
        authorization: { id: 'auth-1' },
      } as any;
      const actorContext = { actorID: 'user-1' } as any;
      const deleteData = { ID: 'app-1' };
      const deletedApp = { id: 'app-1' } as any;

      (applicationService.getApplicationOrFail as Mock).mockResolvedValue(
        mockApplication
      );
      (authorizationService.grantAccessOrFail as Mock).mockResolvedValue(
        undefined
      );
      (applicationService.deleteApplication as Mock).mockResolvedValue(
        deletedApp
      );

      const result = await resolver.deleteApplication(actorContext, deleteData);

      expect(result).toBe(deletedApp);
      expect(applicationService.getApplicationOrFail).toHaveBeenCalledWith(
        'app-1'
      );
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(applicationService.deleteApplication).toHaveBeenCalledWith(
        deleteData
      );
    });
  });
});
