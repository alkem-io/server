import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CalloutAuthorizationService } from '../callout/callout.service.authorization';
import { CalloutsSetService } from './callouts.set.service';
import { CalloutsSetAuthorizationService } from './callouts.set.service.authorization';

describe('CalloutsSetAuthorizationService', () => {
  let service: CalloutsSetAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let calloutsSetService: CalloutsSetService;
  let calloutAuthorizationService: CalloutAuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutsSetAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CalloutsSetAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    calloutsSetService = module.get(CalloutsSetService);
    calloutAuthorizationService = module.get(CalloutAuthorizationService);
  });

  describe('applyAuthorizationPolicy', () => {
    const platformRolesAccess = { roles: [] } as any;
    const parentAuth = { id: 'auth-parent' } as any;

    it('should inherit parent authorization and append privilege rules', async () => {
      const calloutsSetAuth = {
        id: 'auth-cs',
        credentialRules: [],
      } as any;
      const inheritedAuth = {
        id: 'auth-inherited',
        credentialRules: [],
      } as any;
      const calloutsSet = {
        id: 'cs-1',
        authorization: calloutsSetAuth,
        callouts: [],
      } as any;

      vi.mocked(calloutsSetService.getCalloutsSetOrFail).mockResolvedValue(
        calloutsSet
      );
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.createCredentialRuleUsingTypesOnly
      ).mockReturnValue({ id: 'rule', cascade: true } as any);

      const result = await service.applyAuthorizationPolicy(
        { id: 'cs-1' } as any,
        parentAuth,
        platformRolesAccess
      );

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(calloutsSetAuth, parentAuth);
      expect(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).toHaveBeenCalled();
      expect(result).toContain(inheritedAuth);
    });

    it('should propagate authorization to each callout', async () => {
      const inheritedAuth = {
        id: 'auth-inherited',
        credentialRules: [],
      } as any;
      const calloutsSet = {
        id: 'cs-1',
        authorization: { id: 'auth-cs', credentialRules: [] },
        callouts: [{ id: 'callout-1' }, { id: 'callout-2' }],
      } as any;

      vi.mocked(calloutsSetService.getCalloutsSetOrFail).mockResolvedValue(
        calloutsSet
      );
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.createCredentialRuleUsingTypesOnly
      ).mockReturnValue({ id: 'rule', cascade: true } as any);
      vi.mocked(
        calloutAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'callout-auth' }] as any);

      const result = await service.applyAuthorizationPolicy(
        { id: 'cs-1' } as any,
        parentAuth,
        platformRolesAccess
      );

      expect(
        calloutAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledTimes(2);
      // cs auth + 2 callout auths = 3
      expect(result.length).toBe(3);
    });

    it('should append credential rules from parent', async () => {
      const inheritedAuth = {
        id: 'auth-inherited',
        credentialRules: [],
      } as any;
      const calloutsSet = {
        id: 'cs-1',
        authorization: { id: 'auth-cs', credentialRules: [] },
        callouts: [],
      } as any;
      const credentialRulesFromParent = [{ id: 'parent-rule-1' }] as any;

      vi.mocked(calloutsSetService.getCalloutsSetOrFail).mockResolvedValue(
        calloutsSet
      );
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.createCredentialRuleUsingTypesOnly
      ).mockReturnValue({ id: 'rule', cascade: true } as any);

      await service.applyAuthorizationPolicy(
        { id: 'cs-1' } as any,
        parentAuth,
        platformRolesAccess,
        credentialRulesFromParent
      );

      expect(inheritedAuth.credentialRules).toContain(
        credentialRulesFromParent[0]
      );
    });

    it('should add CREATE_CALLOUT privilege for contributors when space settings allow it', async () => {
      const inheritedAuth = {
        id: 'auth-inherited',
        credentialRules: [],
      } as any;
      const calloutsSet = {
        id: 'cs-1',
        authorization: { id: 'auth-cs', credentialRules: [] },
        callouts: [],
      } as any;
      const spaceSettings = {
        collaboration: { allowMembersToCreateCallouts: true },
      } as any;

      vi.mocked(calloutsSetService.getCalloutsSetOrFail).mockResolvedValue(
        calloutsSet
      );
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.createCredentialRuleUsingTypesOnly
      ).mockReturnValue({ id: 'rule', cascade: true } as any);

      await service.applyAuthorizationPolicy(
        { id: 'cs-1' } as any,
        parentAuth,
        platformRolesAccess,
        [],
        undefined,
        spaceSettings
      );

      // Should be called with 2 privilege rules (create + contribute)
      const appendCall = vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).mock.calls[0];
      expect(appendCall[1].length).toBe(2);
    });
  });
});
