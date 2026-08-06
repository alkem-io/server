import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformConfigurationAuditService } from '@src/platform-admin/platform-configuration-audit/platform.configuration.audit.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { PlatformWellKnownVirtualContributorsResolverMutations } from './platform.well.known.virtual.contributors.resolver.mutations';
import { PlatformWellKnownVirtualContributorsService } from './platform.well.known.virtual.contributors.service';

/**
 * 027-platform-role-redesign (sec-server-23 fix, 2026-07-31).
 *
 * A10 consolidated a family of platform-settings mutations onto ONE
 * `PLATFORM_SETTINGS_ADMIN` privilege — but the family did not share a
 * pre-feature gate. Most members were already on PLATFORM_SETTINGS_ADMIN
 * (pre-feature reachers {GLOBAL_ADMIN, GLOBAL_PLATFORM_MANAGER});
 * `setPlatformWellKnownVirtualContributor` was on the PLATFORM_ADMIN
 * catch-all (pre-feature reachers {GLOBAL_ADMIN, GLOBAL_SUPPORT,
 * GLOBAL_LICENSE_MANAGER}). Consolidation therefore grants each member the
 * UNION, and GLOBAL_PLATFORM_MANAGER gains a mutation it never held.
 *
 * The resolver pins its own check to this surface's own pre-feature set plus
 * the owning role. These tests wire the REAL AuthorizationPolicyService +
 * AuthorizationService so the constructor builds a genuine policy — a mocked
 * `grantAccessOrFail` would assert nothing about who the pin actually admits.
 *
 * Same shape as `emailChangePolicy — real-engine integration`
 * (admin.user.email.change.resolver.mutations.spec.ts, sec-server-7).
 */
describe('PlatformWellKnownVirtualContributorsResolverMutations', () => {
  let resolver: PlatformWellKnownVirtualContributorsResolverMutations;
  let wellKnownService: Record<string, Mock>;
  let configurationAuditService: Record<string, Mock>;

  const buildActorContext = (
    ...credentialTypes: AuthorizationCredential[]
  ): ActorContext =>
    ({
      actorID: 'actor-1',
      credentials: credentialTypes.map(type => ({ type, resourceID: '' })),
    }) as any as ActorContext;

  const mappingData = {
    wellKnown: VirtualContributorWellKnown.CHAT_GUIDANCE,
    virtualContributorID: 'vc-1',
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformWellKnownVirtualContributorsResolverMutations,
        AuthorizationPolicyService,
        AuthorizationService,
        MockWinstonProvider,
        repositoryProviderMockFactory(AuthorizationPolicy),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(
      PlatformWellKnownVirtualContributorsResolverMutations
    );
    wellKnownService = module.get(
      PlatformWellKnownVirtualContributorsService
    ) as any;
    wellKnownService.setMapping.mockResolvedValue({
      [VirtualContributorWellKnown.CHAT_GUIDANCE]: 'vc-1',
    });
    configurationAuditService = module.get(
      PlatformConfigurationAuditService
    ) as any;
    configurationAuditService.recordChangeForActor.mockResolvedValue(undefined);
  });

  describe('wellKnownVirtualContributorSetPolicy — real-engine integration', () => {
    // 027-platform-role-redesign (T076/T077, Slice B): the sec-server-23 pin
    // that stood here is gone, and so are both tests that expressed it.
    //
    // The pin existed because `global-platform-manager` did NOT reach this
    // mutation pre-feature while the three legacy broad credentials did, so the
    // additive slice had to keep those three in and that one out. All four are
    // retired. `platform-settings-admin` — which the substitution would have
    // aimed the denial at — is now the OWNING role (spec row 4 owns the
    // well-known VC), so asserting a denial for it would invert the intent.
    //
    // What survives is the positive case below plus the audit-attribution test,
    // which is now asserting an EMPTY legacy-reacher list rather than a
    // three-element one.
    it('DENIES an actor holding no platform role at all', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.GLOBAL_REGISTERED
      );

      await expect(
        resolver.setPlatformWellKnownVirtualContributor(actor, mappingData)
      ).rejects.toBeDefined();
      expect(wellKnownService.setMapping).not.toHaveBeenCalled();
    });

    it('ALLOWS the owning platform-settings-admin role', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_SETTINGS_ADMIN
      );

      await resolver.setPlatformWellKnownVirtualContributor(actor, mappingData);

      expect(wellKnownService.setMapping).toHaveBeenCalled();
    });

    // T077 (Slice B): the reacher list is now EMPTY, and that is the assertion.
    // A non-empty legacy list would let `resolveInitiatorRole` attribute a write
    // to the retired `platform_admin` coarse tier — an audit trail naming a
    // caller that can no longer exist. This is the executable form of T018's
    // "the carve-out expires by construction".
    it('records the configuration change with an EMPTY legacy-reacher list — the carve-out has expired', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_SETTINGS_ADMIN
      );

      await resolver.setPlatformWellKnownVirtualContributor(actor, mappingData);

      const [, , legacyReachers] =
        configurationAuditService.recordChangeForActor.mock.calls[0];
      expect(legacyReachers).toEqual([]);
    });
  });
});
