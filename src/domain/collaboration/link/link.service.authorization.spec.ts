import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { ILink } from './link.interface';
import { LinkAuthorizationService } from './link.service.authorization';

describe('LinkAuthorizationService', () => {
  let service: LinkAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let profileAuthorizationService: ProfileAuthorizationService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LinkAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    profileAuthorizationService = module.get(ProfileAuthorizationService);
  });

  describe('applyAuthorizationPolicy', () => {
    it('should throw RelationshipNotFoundException when profile is missing', async () => {
      const link = {
        id: 'link-1',
        profile: undefined,
        authorization: { id: 'auth-1', credentialRules: [] },
      } as unknown as ILink;

      await expect(
        service.applyAuthorizationPolicy(link, undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should inherit parent authorization and propagate to profile', async () => {
      const linkAuth = { id: 'auth-link', credentialRules: [] } as any;
      const inheritedAuth = {
        id: 'auth-inherited',
        credentialRules: [],
      } as any;
      const parentAuth = { id: 'auth-parent', credentialRules: [] } as any;
      const profileAuths = [{ id: 'auth-profile' }] as any;

      const link = {
        id: 'link-1',
        profile: { id: 'profile-1' },
        authorization: linkAuth,
      } as unknown as ILink;

      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue(profileAuths);

      const result = await service.applyAuthorizationPolicy(
        link,
        parentAuth,
        undefined
      );

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(linkAuth, parentAuth);
      expect(
        profileAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('profile-1', expect.anything());
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should add credential rule for createdByID when provided', async () => {
      const linkAuth = { id: 'auth-link', credentialRules: [] } as any;
      const inheritedAuth = {
        id: 'auth-inherited',
        credentialRules: [],
      } as any;

      const link = {
        id: 'link-1',
        profile: { id: 'profile-1' },
        authorization: linkAuth,
      } as unknown as ILink;

      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ id: 'rule-1' } as any);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy(link, undefined, 'user-123');

      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
      expect(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).toHaveBeenCalledWith(inheritedAuth, expect.arrayContaining([]));
    });

    it('should not add credential rule when createdByID is undefined', async () => {
      const linkAuth = { id: 'auth-link', credentialRules: [] } as any;
      const inheritedAuth = {
        id: 'auth-inherited',
        credentialRules: [],
      } as any;

      const link = {
        id: 'link-1',
        profile: { id: 'profile-1' },
        authorization: linkAuth,
      } as unknown as ILink;

      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy(link, undefined, undefined);

      expect(
        authorizationPolicyService.createCredentialRule
      ).not.toHaveBeenCalled();
    });
  });
});
