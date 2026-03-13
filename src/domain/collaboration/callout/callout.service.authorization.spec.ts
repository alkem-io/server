import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { EntityNotInitializedException } from '@common/exceptions';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ClassificationAuthorizationService } from '@domain/common/classification/classification.service.authorization';
import { RoomAuthorizationService } from '@domain/communication/room/room.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CalloutContributionAuthorizationService } from '../callout-contribution/callout.contribution.service.authorization';
import { CalloutFramingAuthorizationService } from '../callout-framing/callout.framing.service.authorization';
import { CalloutService } from './callout.service';
import { CalloutAuthorizationService } from './callout.service.authorization';

describe('CalloutAuthorizationService', () => {
  let service: CalloutAuthorizationService;
  let calloutService: CalloutService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let contributionAuthorizationService: CalloutContributionAuthorizationService;
  let framingAuthorizationService: CalloutFramingAuthorizationService;
  let roomAuthorizationService: RoomAuthorizationService;
  let classificationAuthorizationService: ClassificationAuthorizationService;
  let roleSetService: RoleSetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CalloutAuthorizationService);
    calloutService = module.get(CalloutService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    contributionAuthorizationService = module.get(
      CalloutContributionAuthorizationService
    );
    framingAuthorizationService = module.get(
      CalloutFramingAuthorizationService
    );
    roomAuthorizationService = module.get(RoomAuthorizationService);
    classificationAuthorizationService = module.get(
      ClassificationAuthorizationService
    );
    roleSetService = module.get(RoleSetService);
  });

  const platformRolesAccess = { roles: [] } as any;

  function createCallout(overrides: any = {}) {
    return {
      id: 'callout-1',
      createdBy: 'user-1',
      isTemplate: false,
      contributions: [],
      contributionDefaults: { id: 'defaults-1' },
      settings: {
        visibility: CalloutVisibility.PUBLISHED,
        contribution: {
          allowedTypes: [CalloutContributionType.POST],
        },
      },
      framing: { id: 'framing-1', profile: { id: 'profile-1' } },
      comments: undefined,
      classification: undefined,
      authorization: { id: 'auth-callout', credentialRules: [] },
      calloutsSet: undefined,
      ...overrides,
    } as any;
  }

  function setupBaseMocks(callout: any) {
    vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
    vi.mocked(
      authorizationPolicyService.inheritParentAuthorization
    ).mockReturnValue(callout.authorization);
    vi.mocked(
      authorizationPolicyService.appendPrivilegeAuthorizationRules
    ).mockReturnValue(callout.authorization);
    vi.mocked(
      authorizationPolicyService.appendCredentialAuthorizationRules
    ).mockReturnValue(callout.authorization);
    vi.mocked(authorizationPolicyService.createCredentialRule).mockReturnValue({
      id: 'rule',
      cascade: true,
    } as any);
    vi.mocked(
      authorizationPolicyService.createCredentialRuleUsingTypesOnly
    ).mockReturnValue({ id: 'type-rule', cascade: true } as any);
    vi.mocked(
      framingAuthorizationService.applyAuthorizationPolicy
    ).mockResolvedValue([]);
  }

  describe('applyAuthorizationPolicy', () => {
    it('should throw EntityNotInitializedException when contributions are missing', async () => {
      const callout = createCallout({ contributions: undefined });
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);

      await expect(
        service.applyAuthorizationPolicy(
          'callout-1',
          undefined,
          platformRolesAccess
        )
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when contributionDefaults are missing', async () => {
      const callout = createCallout({ contributionDefaults: undefined });
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);

      await expect(
        service.applyAuthorizationPolicy(
          'callout-1',
          undefined,
          platformRolesAccess
        )
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when settings are missing', async () => {
      const callout = createCallout({ settings: undefined });
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);

      await expect(
        service.applyAuthorizationPolicy(
          'callout-1',
          undefined,
          platformRolesAccess
        )
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when framing is missing', async () => {
      const callout = createCallout({ framing: undefined });
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);

      await expect(
        service.applyAuthorizationPolicy(
          'callout-1',
          undefined,
          platformRolesAccess
        )
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should inherit parent authorization and propagate to framing', async () => {
      const callout = createCallout();
      const parentAuth = { id: 'auth-parent' } as any;

      setupBaseMocks(callout);

      const result = await service.applyAuthorizationPolicy(
        'callout-1',
        parentAuth,
        platformRolesAccess
      );

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalled();
      expect(
        framingAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(callout.framing, callout.authorization, undefined);
      expect(result).toContain(callout.authorization);
    });

    it('should propagate authorization to contributions', async () => {
      const callout = createCallout({
        contributions: [{ id: 'contrib-1' }, { id: 'contrib-2' }],
      });

      setupBaseMocks(callout);
      vi.mocked(
        contributionAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-contrib' }] as any);

      const result = await service.applyAuthorizationPolicy(
        'callout-1',
        undefined,
        platformRolesAccess
      );

      expect(
        contributionAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledTimes(2);
      expect(result.length).toBeGreaterThanOrEqual(3); // callout + 2 contrib
    });

    it('should apply room authorization when comments exist', async () => {
      const callout = createCallout({
        comments: { id: 'room-1' },
      });
      const commentsAuth = { id: 'auth-comments' } as any;

      setupBaseMocks(callout);
      vi.mocked(
        roomAuthorizationService.applyAuthorizationPolicy
      ).mockReturnValue(commentsAuth);
      vi.mocked(
        roomAuthorizationService.allowContributorsToCreateMessages
      ).mockReturnValue(commentsAuth);
      vi.mocked(
        roomAuthorizationService.allowContributorsToReplyReactToMessages
      ).mockReturnValue(commentsAuth);

      const result = await service.applyAuthorizationPolicy(
        'callout-1',
        undefined,
        platformRolesAccess
      );

      expect(
        roomAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(result).toContain(commentsAuth);
    });

    it('should apply classification authorization when classification exists', async () => {
      const callout = createCallout({
        classification: { id: 'class-1' },
      });

      setupBaseMocks(callout);
      vi.mocked(
        classificationAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-class' }] as any);

      const result = await service.applyAuthorizationPolicy(
        'callout-1',
        undefined,
        platformRolesAccess
      );

      expect(
        classificationAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('class-1', callout.authorization);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should return parent auth unchanged for PUBLISHED visibility', async () => {
      const callout = createCallout({
        settings: {
          visibility: CalloutVisibility.PUBLISHED,
          contribution: { allowedTypes: [] },
        },
      });
      const parentAuth = { id: 'auth-parent', credentialRules: [] } as any;

      setupBaseMocks(callout);

      await service.applyAuthorizationPolicy(
        'callout-1',
        parentAuth,
        platformRolesAccess
      );

      // For PUBLISHED, should NOT clone the parent auth
      expect(
        authorizationPolicyService.cloneAuthorizationPolicy
      ).not.toHaveBeenCalled();
    });

    it('should clone and restrict parent auth for DRAFT visibility', async () => {
      const callout = createCallout({
        settings: {
          visibility: CalloutVisibility.DRAFT,
          contribution: { allowedTypes: [] },
        },
        calloutsSet: {
          collaboration: {
            space: {
              id: 'space-1',
              community: {
                roleSet: { id: 'roleset-1' },
              },
            },
          },
        },
      });
      const parentAuth = {
        id: 'auth-parent',
        credentialRules: [
          { grantedPrivileges: ['READ', 'UPDATE'], other: 'data' },
        ],
      } as any;
      const clonedAuth = {
        id: 'auth-cloned',
        credentialRules: [
          { grantedPrivileges: ['READ', 'UPDATE'], other: 'data' },
        ],
      } as any;

      setupBaseMocks(callout);
      vi.mocked(
        authorizationPolicyService.cloneAuthorizationPolicy
      ).mockReturnValue(clonedAuth);
      vi.mocked(
        roleSetService.getCredentialsForRoleWithParents
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy(
        'callout-1',
        parentAuth,
        platformRolesAccess
      );

      expect(
        authorizationPolicyService.cloneAuthorizationPolicy
      ).toHaveBeenCalledWith(parentAuth);
    });

    it('should return parent auth unchanged for template callouts even in DRAFT', async () => {
      const callout = createCallout({
        isTemplate: true,
        settings: {
          visibility: CalloutVisibility.DRAFT,
          contribution: { allowedTypes: [] },
        },
      });
      const parentAuth = { id: 'auth-parent', credentialRules: [] } as any;

      setupBaseMocks(callout);

      await service.applyAuthorizationPolicy(
        'callout-1',
        parentAuth,
        platformRolesAccess
      );

      expect(
        authorizationPolicyService.cloneAuthorizationPolicy
      ).not.toHaveBeenCalled();
    });

    it('should add createdBy credential rule when createdBy is set', async () => {
      const callout = createCallout({ createdBy: 'user-abc' });

      setupBaseMocks(callout);

      await service.applyAuthorizationPolicy(
        'callout-1',
        undefined,
        platformRolesAccess
      );

      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
    });

    it('should not add createdBy credential rule when createdBy is empty', async () => {
      const callout = createCallout({ createdBy: '' });

      setupBaseMocks(callout);

      await service.applyAuthorizationPolicy(
        'callout-1',
        undefined,
        platformRolesAccess
      );

      // createCredentialRule is still called for publisher update rule, but not for createdBy
      const calls = vi.mocked(authorizationPolicyService.createCredentialRule)
        .mock.calls;
      // Should only have been called for the draft read access, not for CREDENTIAL_RULE_CALLOUT_CREATED_BY
      expect(calls.length).toBeLessThan(2);
    });
  });
});
