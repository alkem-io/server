import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { ApplicationService } from './application.service';
import { ApplicationAuthorizationService } from './application.service.authorization';

describe('ApplicationAuthorizationService', () => {
  let service: ApplicationAuthorizationService;
  let applicationService: ApplicationService;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<ApplicationAuthorizationService>(
      ApplicationAuthorizationService
    );
    applicationService = module.get<ApplicationService>(ApplicationService);
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should inherit parent authorization and extend with user rules', async () => {
      const mockUser = { id: 'user-1' } as any;
      const mockAuth = { id: 'auth-1', credentialRules: [] } as any;
      const mockApplication = {
        id: 'app-1',
        authorization: mockAuth,
      } as any;
      const parentAuth = { id: 'parent-auth' } as any;

      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(mockAuth);
      (applicationService.getActor as Mock).mockResolvedValue(mockUser);
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: 'rule-1' }
      );
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(mockAuth);

      const result = await service.applyAuthorizationPolicy(
        mockApplication,
        parentAuth
      );

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(mockAuth, parentAuth);
      expect(applicationService.getActor).toHaveBeenCalledWith('app-1');
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
      expect(result).toBe(mockAuth);
    });

    it('should work with undefined parent authorization', async () => {
      const mockUser = { id: 'user-1' } as any;
      const mockAuth = { id: 'auth-1', credentialRules: [] } as any;
      const mockApplication = {
        id: 'app-1',
        authorization: mockAuth,
      } as any;

      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(mockAuth);
      (applicationService.getActor as Mock).mockResolvedValue(mockUser);
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: 'rule-1' }
      );
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(mockAuth);

      await service.applyAuthorizationPolicy(mockApplication, undefined);

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(mockAuth, undefined);
    });
  });
});
