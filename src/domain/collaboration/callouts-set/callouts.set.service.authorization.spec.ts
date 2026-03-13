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
  let calloutsSetService: CalloutsSetService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let calloutAuthorizationService: CalloutAuthorizationService;

  beforeEach(async () => {
    vi.restoreAllMocks();

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
    calloutsSetService = module.get(CalloutsSetService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    calloutAuthorizationService = module.get(CalloutAuthorizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should inherit parent authorization and apply to all callouts', async () => {
      const calloutsSet = {
        id: 'cs-1',
        authorization: {
          id: 'auth-cs',
          credentialRules: [],
        },
        callouts: [{ id: 'c-1' }, { id: 'c-2' }],
      } as any;

      vi.mocked(calloutsSetService.getCalloutsSetOrFail).mockResolvedValue(
        calloutsSet
      );
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(calloutsSet.authorization);
      vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).mockReturnValue(calloutsSet.authorization);
      vi.mocked(
        authorizationPolicyService.createCredentialRuleUsingTypesOnly
      ).mockReturnValue({ cascade: true } as any);
      vi.mocked(
        calloutAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-callout' }] as any);

      const result = await service.applyAuthorizationPolicy(
        { id: 'cs-1' } as any,
        { id: 'parent-auth' } as any,
        {} as any,
        [],
        undefined,
        undefined
      );

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalled();
      expect(
        calloutAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledTimes(2);
      // cs-1 authorization + 2 callout authorizations
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle calloutsSet with no callouts', async () => {
      const calloutsSet = {
        id: 'cs-1',
        authorization: {
          id: 'auth-cs',
          credentialRules: [],
        },
        callouts: undefined,
      } as any;

      vi.mocked(calloutsSetService.getCalloutsSetOrFail).mockResolvedValue(
        calloutsSet
      );
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(calloutsSet.authorization);
      vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).mockReturnValue(calloutsSet.authorization);
      vi.mocked(
        authorizationPolicyService.createCredentialRuleUsingTypesOnly
      ).mockReturnValue({ cascade: true } as any);

      const result = await service.applyAuthorizationPolicy(
        { id: 'cs-1' } as any,
        { id: 'parent-auth' } as any,
        {} as any
      );

      expect(
        calloutAuthorizationService.applyAuthorizationPolicy
      ).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should append credential rules from parent', async () => {
      const calloutsSet = {
        id: 'cs-1',
        authorization: {
          id: 'auth-cs',
          credentialRules: [],
        },
        callouts: [],
      } as any;

      const credentialRulesFromParent = [{ id: 'parent-rule' }] as any;

      vi.mocked(calloutsSetService.getCalloutsSetOrFail).mockResolvedValue(
        calloutsSet
      );
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(calloutsSet.authorization);
      vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).mockReturnValue(calloutsSet.authorization);
      vi.mocked(
        authorizationPolicyService.createCredentialRuleUsingTypesOnly
      ).mockReturnValue({ cascade: true } as any);

      await service.applyAuthorizationPolicy(
        { id: 'cs-1' } as any,
        { id: 'parent-auth' } as any,
        {} as any,
        credentialRulesFromParent
      );

      expect(calloutsSet.authorization.credentialRules).toContain(
        credentialRulesFromParent[0]
      );
    });

    it('should append members create callout privilege when space settings allow it', async () => {
      const calloutsSet = {
        id: 'cs-1',
        authorization: {
          id: 'auth-cs',
          credentialRules: [],
        },
        callouts: [],
      } as any;

      vi.mocked(calloutsSetService.getCalloutsSetOrFail).mockResolvedValue(
        calloutsSet
      );
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(calloutsSet.authorization);
      vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).mockReturnValue(calloutsSet.authorization);
      vi.mocked(
        authorizationPolicyService.createCredentialRuleUsingTypesOnly
      ).mockReturnValue({ cascade: true } as any);

      const spaceSettings = {
        collaboration: { allowMembersToCreateCallouts: true },
      } as any;

      await service.applyAuthorizationPolicy(
        { id: 'cs-1' } as any,
        { id: 'parent-auth' } as any,
        {} as any,
        [],
        undefined,
        spaceSettings
      );

      expect(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).toHaveBeenCalled();
    });
  });
});
