import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { PlatformInvitationAuthorizationService } from './platform.invitation.service.authorization';

describe('PlatformInvitationAuthorizationService', () => {
  let service: PlatformInvitationAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformInvitationAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<PlatformInvitationAuthorizationService>(
      PlatformInvitationAuthorizationService
    );
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should inherit parent authorization', async () => {
      const mockAuth = { id: 'auth-1' } as any;
      const mockInvitation = {
        id: 'inv-1',
        authorization: mockAuth,
      } as any;
      const parentAuth = { id: 'parent-auth' } as any;
      const updatedAuth = { id: 'updated-auth' } as any;

      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(updatedAuth);

      const result = await service.applyAuthorizationPolicy(
        mockInvitation,
        parentAuth
      );

      expect(result).toBe(updatedAuth);
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(mockAuth, parentAuth);
    });

    it('should work with undefined parent authorization', async () => {
      const mockAuth = { id: 'auth-1' } as any;
      const mockInvitation = {
        id: 'inv-1',
        authorization: mockAuth,
      } as any;

      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(mockAuth);

      const result = await service.applyAuthorizationPolicy(
        mockInvitation,
        undefined
      );

      expect(result).toBe(mockAuth);
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(mockAuth, undefined);
    });
  });
});
