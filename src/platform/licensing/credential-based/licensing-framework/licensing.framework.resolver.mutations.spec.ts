import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformConfigurationAuditService } from '@src/platform-admin/platform-configuration-audit/platform.configuration.audit.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { LicensingFrameworkResolverMutations } from './licensing.framework.resolver.mutations';
import { LicensingFrameworkService } from './licensing.framework.service';

/**
 * server-C2-a (advocate/skeptic debate) — `createLicensePlan` was the one
 * A13 surface the T058 census missed: it kept checking bare CREATE against
 * `licensing.authorization`, which inherits the root policy as its parent,
 * so the root rule's `platform-content-full-access` CRUD cascade (T036a)
 * satisfied the check too. Wires the REAL AuthorizationService so the
 * fix's `grantAccessOrFail` against `licenseDefinitionPolicy` is genuinely
 * exercised — a mocked `grantAccessOrFail` would assert nothing about who
 * the gate actually admits. Same shape as
 * `platform.well.known.virtual.contributors.resolver.mutations.spec.ts`.
 */
describe('LicensingFrameworkResolverMutations', () => {
  let resolver: LicensingFrameworkResolverMutations;
  let licensingFrameworkService: Record<string, Mock>;
  let platformConfigurationAuditService: Record<string, Mock>;

  const buildActorContext = (
    ...credentialTypes: AuthorizationCredential[]
  ): ActorContext =>
    ({
      actorID: 'actor-1',
      credentials: credentialTypes.map(type => ({ type, resourceID: '' })),
    }) as any as ActorContext;

  // Models the root cascade (T036a): licensing.authorization inherits the
  // root policy, whose CRUD rule grants platform-content-full-access
  // CREATE. Kept on the fixture even though the fixed resolver no longer
  // gates on it, to prove the fix stopped reading it for authorization.
  const buildLicensing = () => {
    const authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.IN_MEMORY
    );
    authorization.credentialRules = [
      new AuthorizationPolicyRuleCredential(
        [AuthorizationPrivilege.CREATE],
        [
          {
            type: AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
            resourceID: '',
          },
        ],
        'root-content-cascade'
      ),
    ];
    return { id: 'licensing-1', authorization };
  };

  const planData = { licensingFrameworkID: 'licensing-1' } as any;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicensingFrameworkResolverMutations,
        AuthorizationService,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(LicensingFrameworkResolverMutations);
    licensingFrameworkService = module.get(LicensingFrameworkService) as any;
    platformConfigurationAuditService = module.get(
      PlatformConfigurationAuditService
    ) as any;
    licensingFrameworkService.getLicensingOrFail.mockResolvedValue(
      buildLicensing()
    );
  });

  it('DENIES an actor with only platform-content-full-access — the root cascade must not reach A13 (server-C2-a)', async () => {
    const actor = buildActorContext(
      AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS
    );

    await expect(
      resolver.createLicensePlan(actor, planData)
    ).rejects.toBeDefined();
    expect(licensingFrameworkService.createLicensePlan).not.toHaveBeenCalled();
    expect(
      platformConfigurationAuditService.recordChangeForActor
    ).not.toHaveBeenCalled();
  });

  it('ALLOWS the owning platform-settings-admin role and audits the change', async () => {
    const actor = buildActorContext(
      AuthorizationCredential.PLATFORM_SETTINGS_ADMIN
    );
    const created = { id: 'plan-1' };
    licensingFrameworkService.createLicensePlan.mockResolvedValue(created);

    const result = await resolver.createLicensePlan(actor, planData);

    expect(result).toBe(created);
    expect(licensingFrameworkService.createLicensePlan).toHaveBeenCalledWith(
      planData
    );
    expect(
      platformConfigurationAuditService.recordChangeForActor
    ).toHaveBeenCalledTimes(1);
    const [passedActor, owners, , input] =
      platformConfigurationAuditService.recordChangeForActor.mock.calls[0];
    expect(passedActor).toBe(actor);
    expect(owners).toContain(AuthorizationCredential.PLATFORM_SETTINGS_ADMIN);
    expect(input).toMatchObject({
      setting: 'licensePlan',
      licensePlanId: 'plan-1',
      outcome: 'success',
    });
  });
});
