import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { IAuthorizationPolicy } from '../authorization-policy/authorization.policy.interface';
import { ILicense } from './license.interface';
import { LicenseAuthorizationService } from './license.service.authorization';

describe('LicenseAuthorizationService', () => {
  let service: LicenseAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicenseAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LicenseAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
  });

  describe('applyAuthorizationPolicy', () => {
    it('should inherit parent authorization and return updated policies', () => {
      const authorization = {
        id: 'auth-1',
        credentialRules: [],
      } as unknown as IAuthorizationPolicy;
      const parentAuthorization = {
        id: 'parent-auth',
      } as unknown as IAuthorizationPolicy;
      const license = { authorization } as ILicense;

      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(authorization);

      const result = service.applyAuthorizationPolicy(
        license,
        parentAuthorization
      );

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(authorization, parentAuthorization);
      expect(result).toContain(authorization);
    });

    it('should push credential rules from parent', () => {
      const credentialRules: any[] = [];
      const authorization = {
        id: 'auth-1',
        credentialRules,
      } as unknown as IAuthorizationPolicy;
      const license = { authorization } as ILicense;
      const parentRule = { name: 'parent-rule' } as any;

      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(authorization);

      service.applyAuthorizationPolicy(license, undefined, [parentRule]);

      expect(credentialRules).toContain(parentRule);
    });

    it('should work with no credential rules from parent', () => {
      const authorization = {
        id: 'auth-1',
        credentialRules: [],
      } as unknown as IAuthorizationPolicy;
      const license = { authorization } as ILicense;

      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(authorization);

      const result = service.applyAuthorizationPolicy(license, undefined);

      expect(result.length).toBeGreaterThan(0);
    });
  });
});
