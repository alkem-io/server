import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { SecondFactorAuditService } from '@core/auth/second-factor/second-factor.audit.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { PlatformSettingsService } from '@platform/platform-settings/platform.settings.service';
import { PlatformConfigurationAuditService } from '@src/platform-admin/platform-configuration-audit/platform.configuration.audit.service';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { PlatformResolverMutations } from './platform.resolver.mutations';
import { PlatformService } from './platform.service';
import { PlatformAuthorizationService } from './platform.service.authorization';

describe('PlatformResolverMutations', () => {
  let module: TestingModule;
  let resolver: PlatformResolverMutations;
  let authorizationService: AuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let platformService: PlatformService;
  let platformAuthorizationService: PlatformAuthorizationService;
  let platformAuthorizationPolicyService: PlatformAuthorizationPolicyService;
  let platformSettingsService: PlatformSettingsService;

  const mockActorContext = { actorID: 'actor-1' } as ActorContext;

  const mockPlatform = {
    id: 'p1',
    authorization: { id: 'auth-1' },
    settings: {
      integration: {
        iframeAllowedUrls: ['https://existing.com'],
        notificationEmailBlacklist: ['existing@test.com'],
      },
    },
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    module = await Test.createTestingModule({
      providers: [PlatformResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(PlatformResolverMutations);
    authorizationService = module.get(AuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    platformService = module.get(PlatformService);
    platformAuthorizationService = module.get(PlatformAuthorizationService);
    platformAuthorizationPolicyService = module.get(
      PlatformAuthorizationPolicyService
    );
    platformSettingsService = module.get(PlatformSettingsService);
  });

  describe('authorizationPolicyResetOnPlatform', () => {
    it('should reset authorization policy and return platform', async () => {
      const platformPolicy = { id: 'pp-1' };
      (
        platformAuthorizationPolicyService.getPlatformAuthorizationPolicy as Mock
      ).mockResolvedValue(platformPolicy);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (
        platformAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue([]);
      (platformService.getPlatformOrFail as Mock).mockResolvedValue(
        mockPlatform
      );

      const result =
        await resolver.authorizationPolicyResetOnPlatform(mockActorContext);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        platformPolicy,
        AuthorizationPrivilege.AUTHORIZATION_RESET,
        expect.any(String)
      );
      expect(result).toBe(mockPlatform);
    });
  });

  describe('updatePlatformSettings', () => {
    it('should update settings with proper authorization', async () => {
      (platformService.getPlatformOrFail as Mock).mockResolvedValue(
        mockPlatform
      );
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      const updatedSettings = { integration: { someKey: 'value' } };
      (platformSettingsService.updateSettings as Mock).mockReturnValue({
        settings: updatedSettings,
      });
      (platformService.savePlatform as Mock).mockResolvedValue(mockPlatform);

      const settingsData = { integration: { someKey: 'value' } } as any;

      const result = await resolver.updatePlatformSettings(
        mockActorContext,
        settingsData
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        mockPlatform.authorization,
        AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN,
        expect.any(String)
      );
      expect(result).toBe(updatedSettings);
    });
  });

  describe('addIframeAllowedURL', () => {
    it('should add URL and save platform', async () => {
      (platformService.getPlatformOrFail as Mock).mockResolvedValue(
        mockPlatform
      );
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      const updatedUrls = ['https://existing.com', 'https://new.com'];
      (
        platformSettingsService.addIframeAllowedURLOrFail as Mock
      ).mockReturnValue(updatedUrls);
      (platformService.savePlatform as Mock).mockResolvedValue(mockPlatform);

      const result = await resolver.addIframeAllowedURL(
        mockActorContext,
        'https://new.com'
      );

      // 027-platform-role-redesign (T045, A10): re-anchored off PLATFORM_ADMIN
      // onto PLATFORM_SETTINGS_ADMIN.
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        mockPlatform.authorization,
        AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN,
        expect.any(String)
      );
      expect(result).toEqual(updatedUrls);
    });
  });

  describe('removeIframeAllowedURL', () => {
    it('should remove URL and save platform', async () => {
      (platformService.getPlatformOrFail as Mock).mockResolvedValue(
        mockPlatform
      );
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      const updatedUrls: string[] = [];
      (
        platformSettingsService.removeIframeAllowedURLOrFail as Mock
      ).mockReturnValue(updatedUrls);
      (platformService.savePlatform as Mock).mockResolvedValue(mockPlatform);

      const result = await resolver.removeIframeAllowedURL(
        mockActorContext,
        'https://existing.com'
      );

      expect(result).toEqual([]);
    });
  });

  describe('addNotificationEmailToBlacklist', () => {
    it('should add email and save platform', async () => {
      (platformService.getPlatformOrFail as Mock).mockResolvedValue(
        mockPlatform
      );
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      const updatedList = ['existing@test.com', 'new@test.com'];
      (
        platformSettingsService.addNotificationEmailToBlacklistOrFail as Mock
      ).mockReturnValue(updatedList);
      (platformService.savePlatform as Mock).mockResolvedValue(mockPlatform);

      const result = await resolver.addNotificationEmailToBlacklist(
        mockActorContext,
        { email: 'new@test.com' } as any
      );

      expect(result).toEqual(updatedList);
    });
  });

  describe('removeNotificationEmailFromBlacklist', () => {
    it('should remove email and save platform', async () => {
      (platformService.getPlatformOrFail as Mock).mockResolvedValue(
        mockPlatform
      );
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      const updatedList: string[] = [];
      (
        platformSettingsService.removeNotificationEmailFromBlacklistOrFail as Mock
      ).mockReturnValue(updatedList);
      (platformService.savePlatform as Mock).mockResolvedValue(mockPlatform);

      const result = await resolver.removeNotificationEmailFromBlacklist(
        mockActorContext,
        { email: 'existing@test.com' } as any
      );

      expect(result).toEqual([]);
    });
  });
  // ===================================================================
  // qual-server-12 (2026-07-31) — every mutation in this file writes an
  // audit row (T058, A3/A10), and NOT ONE of the seven call sites was
  // asserted: each `describe` above checks the gate and the return value and
  // stops there. Deleting every `recordChangeForActor` / `recordOperation`
  // call in this resolver would have left the suite fully green.
  //
  // FR-018's promise is "no administrative change without a record", so the
  // record is part of the mutation's contract, not incidental.
  // ===================================================================
  describe('audit coverage (qual-server-12)', () => {
    const arrangeSettingsMutation = () => {
      (platformService.getPlatformOrFail as Mock).mockResolvedValue(
        mockPlatform
      );
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (platformSettingsService.updateSettings as Mock).mockReturnValue({
        settings: mockPlatform.settings,
      });
      (platformService.savePlatform as Mock).mockResolvedValue(mockPlatform);
      const configurationAudit = module.get(
        PlatformConfigurationAuditService
      ) as any;
      configurationAudit.recordChangeForActor.mockResolvedValue(undefined);
      return configurationAudit;
    };

    it('updatePlatformSettings records a `platformSettings` change', async () => {
      const configurationAudit = arrangeSettingsMutation();

      await resolver.updatePlatformSettings(mockActorContext, {
        integration: { someKey: 'value' },
      } as any);

      expect(configurationAudit.recordChangeForActor).toHaveBeenCalledWith(
        mockActorContext,
        expect.any(Array),
        expect.objectContaining({
          setting: 'platformSettings',
          outcome: 'success',
        })
      );
    });

    // The add/remove pairs deliberately record DIFFERENT payload keys —
    // `newValue` for an addition, `previousValue` for a removal — so the
    // trail says what changed rather than just that something did. Asserting
    // the key, not merely the call, is what makes these tests worth having.
    it.each([
      [
        'addIframeAllowedURL',
        'iframeAllowedUrls',
        'newValue',
        'https://new.example',
        false,
      ],
      [
        'removeIframeAllowedURL',
        'iframeAllowedUrls',
        'previousValue',
        'https://existing.com',
        false,
      ],
      [
        'addNotificationEmailToBlacklist',
        'notificationEmailBlacklist',
        'newValue',
        'new@test.com',
        true,
      ],
      [
        'removeNotificationEmailFromBlacklist',
        'notificationEmailBlacklist',
        'previousValue',
        'existing@test.com',
        true,
      ],
    ])('%s records a `%s` change under `%s`', async (method, setting, payloadKey, value, wrapsInInput) => {
      const configurationAudit = arrangeSettingsMutation();

      // The two blacklist mutations take `@Args('input')
      // NotificationEmailAddressInput`, the two iframe ones a bare string.
      await (resolver as any)[method](
        mockActorContext,
        wrapsInInput ? { email: value } : value
      );

      expect(configurationAudit.recordChangeForActor).toHaveBeenCalledWith(
        mockActorContext,
        expect.any(Array),
        expect.objectContaining({
          setting,
          [payloadKey]: value,
          outcome: 'success',
        })
      );
    });

    // A3's reset is the one surface here that audits BOTH outcomes. The
    // failure row is the more important of the two — an authorization reset
    // that half-applied and threw is exactly the event an operator needs to
    // find afterwards — and it was equally unasserted.
    it('authorizationPolicyResetOnPlatform records a success operation', async () => {
      (
        platformAuthorizationPolicyService.getPlatformAuthorizationPolicy as Mock
      ).mockResolvedValue({ id: 'pp-1' });
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (
        platformAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue([]);
      (platformService.getPlatformOrFail as Mock).mockResolvedValue(
        mockPlatform
      );
      const operationsAudit = module.get(PlatformOperationsAuditService) as any;
      operationsAudit.recordOperation.mockResolvedValue(undefined);

      await resolver.authorizationPolicyResetOnPlatform(mockActorContext);

      expect(operationsAudit.recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          actorID: mockActorContext.actorID,
          action: 'authorizationPolicyResetOnPlatform',
          outcome: 'success',
        })
      );
    });

    it('authorizationPolicyResetOnPlatform records a FAILURE operation and rethrows', async () => {
      const resetFailure = new Error('reset exploded');
      (
        platformAuthorizationPolicyService.getPlatformAuthorizationPolicy as Mock
      ).mockResolvedValue({ id: 'pp-1' });
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (
        platformAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockRejectedValue(resetFailure);
      const operationsAudit = module.get(PlatformOperationsAuditService) as any;
      operationsAudit.recordOperation.mockResolvedValue(undefined);

      await expect(
        resolver.authorizationPolicyResetOnPlatform(mockActorContext)
      ).rejects.toBe(resetFailure);

      expect(operationsAudit.recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'authorizationPolicyResetOnPlatform',
          outcome: 'failure',
          error: resetFailure,
        })
      );
    });
  });
});

describe('PlatformResolverMutations.updatePlatformSettings — the second-factor rule', () => {
  const actor = { actorID: 'actor-1' } as ActorContext;
  const platform = {
    id: 'p1',
    authorization: { id: 'auth-1' },
    settings: {
      integration: { iframeAllowedUrls: [], notificationEmailBlacklist: [] },
    },
  };

  async function build(opts: {
    transition?: { from: boolean; to: boolean; since: string | null };
    recordRuleTransition?: () => Promise<void>;
  }) {
    const module = await Test.createTestingModule({
      providers: [PlatformResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    const resolver = module.get(PlatformResolverMutations);
    const platformService = module.get(PlatformService) as any;
    const settingsService = module.get(PlatformSettingsService) as any;
    const secondFactorAudit = module.get(SecondFactorAuditService) as any;
    const configurationAudit = module.get(
      PlatformConfigurationAuditService
    ) as any;
    const entityManager = module.get(getEntityManagerToken()) as any;

    const log: string[] = [];
    const tx = { id: 'tx' };
    entityManager.transaction.mockImplementation(
      async (work: (m: unknown) => Promise<void>) => {
        log.push('begin');
        try {
          await work(tx);
          log.push('commit');
        } catch (error) {
          log.push('rollback');
          throw error;
        }
      }
    );
    platformService.getPlatformOrFail.mockResolvedValue({ ...platform });
    platformService.savePlatform.mockImplementation(async () => {
      log.push('save');
    });
    settingsService.updateSettings.mockReturnValue({
      settings: { ...platform.settings },
      transition: opts.transition,
    });
    secondFactorAudit.recordRuleTransition.mockImplementation(async () => {
      log.push('transition');
      return opts.recordRuleTransition?.();
    });
    configurationAudit.recordChangeForActor.mockResolvedValue(undefined);
    return {
      resolver,
      platformService,
      secondFactorAudit,
      configurationAudit,
      log,
      tx,
    };
  }

  it.each([
    ['off→on', { from: false, to: true, since: '2026-11-11T10:00:00.000Z' }],
    ['on→off', { from: true, to: false, since: '2026-11-01T10:00:00.000Z' }],
  ])('records %s in the transaction that saves the settings', async (_label, transition) => {
    const { resolver, platformService, secondFactorAudit, log, tx } =
      await build({ transition });

    await resolver.updatePlatformSettings(actor, {
      security: { secondFactorRequiredForPlatformRoles: transition.to },
    } as any);

    expect(log).toEqual(['begin', 'save', 'transition', 'commit']);
    expect(platformService.savePlatform).toHaveBeenCalledWith(
      expect.anything(),
      tx
    );
    expect(secondFactorAudit.recordRuleTransition).toHaveBeenCalledWith(
      tx,
      actor,
      { scope: 'platform', ...transition }
    );
  });

  it('rolls the save back and throws when the transition row cannot be written', async () => {
    const { resolver, log, configurationAudit } = await build({
      transition: { from: false, to: true, since: '2026-11-11T10:00:00.000Z' },
      recordRuleTransition: () => Promise.reject(new Error('db down')),
    });

    await expect(
      resolver.updatePlatformSettings(actor, {
        security: { secondFactorRequiredForPlatformRoles: true },
      } as any)
    ).rejects.toThrow('db down');
    expect(log).toEqual(['begin', 'save', 'transition', 'rollback']);
    expect(configurationAudit.recordChangeForActor).not.toHaveBeenCalled();
  });

  it('writes no transition row for a save without a transition, and records the whole input', async () => {
    const { resolver, secondFactorAudit, configurationAudit } = await build({});
    const settingsData = {
      integration: { iframeAllowedUrls: ['https://x.example'] },
    } as any;

    await resolver.updatePlatformSettings(actor, settingsData);

    expect(secondFactorAudit.recordRuleTransition).not.toHaveBeenCalled();
    expect(configurationAudit.recordChangeForActor).toHaveBeenCalledWith(
      actor,
      expect.any(Array),
      expect.objectContaining({
        setting: 'platformSettings',
        newValue: settingsData,
      })
    );
  });
});
