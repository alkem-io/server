import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { ILibrary } from './library.interface';
import { LibraryAuthorizationService } from './library.service.authorization';

describe('LibraryAuthorizationService', () => {
  let service: LibraryAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LibraryAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should reset, inherit parent, and append anonymous read access', async () => {
      const authorization = { id: 'auth-1' };
      const library = { authorization } as unknown as ILibrary;
      const parentAuth = { id: 'parent-auth' } as any;

      vi.mocked(authorizationPolicyService.reset).mockReturnValue(
        authorization as any
      );
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(authorization as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess
      ).mockReturnValue(authorization as any);

      const result = await service.applyAuthorizationPolicy(
        library,
        parentAuth
      );

      expect(authorizationPolicyService.reset).toHaveBeenCalledWith(
        authorization
      );
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(authorization, parentAuth);
      expect(
        authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess
      ).toHaveBeenCalled();
      expect(result).toBe(authorization);
    });

    it('should work with undefined parent authorization', async () => {
      const authorization = { id: 'auth-1' };
      const library = { authorization } as unknown as ILibrary;

      vi.mocked(authorizationPolicyService.reset).mockReturnValue(
        authorization as any
      );
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(authorization as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess
      ).mockReturnValue(authorization as any);

      const result = await service.applyAuthorizationPolicy(library, undefined);

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(authorization, undefined);
      expect(result).toBe(authorization);
    });
  });
});
