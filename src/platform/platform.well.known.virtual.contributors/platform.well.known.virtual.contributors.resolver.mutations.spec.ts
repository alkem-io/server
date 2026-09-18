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
    it('DENIES a global-platform-manager-only actor — it never held this surface pre-feature (sec-server-23)', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.GLOBAL_PLATFORM_MANAGER
      );

      await expect(
        resolver.setPlatformWellKnownVirtualContributor(actor, mappingData)
      ).rejects.toBeDefined();
      expect(wellKnownService.setMapping).not.toHaveBeenCalled();
    });

    // The three credentials that DID reach this mutation through its
    // pre-feature PLATFORM_ADMIN gate. Slice A is additive: none of them may
    // lose access as a side effect of pinning GLOBAL_PLATFORM_MANAGER out.
    it.each([
      AuthorizationCredential.GLOBAL_ADMIN,
      AuthorizationCredential.GLOBAL_SUPPORT,
      AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
    ])('ALLOWS %s — pre-existing legacy reach preserved', async credential => {
      const actor = buildActorContext(credential);

      await resolver.setPlatformWellKnownVirtualContributor(actor, mappingData);

      expect(wellKnownService.setMapping).toHaveBeenCalledWith(
        mappingData.wellKnown,
        mappingData.virtualContributorID
      );
    });

    it('ALLOWS the owning platform-settings-admin role', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_SETTINGS_ADMIN
      );

      await resolver.setPlatformWellKnownVirtualContributor(actor, mappingData);

      expect(wellKnownService.setMapping).toHaveBeenCalled();
    });

    it('records the configuration change with a legacy-reacher list that MATCHES the pin', async () => {
      const actor = buildActorContext(AuthorizationCredential.GLOBAL_ADMIN);

      await resolver.setPlatformWellKnownVirtualContributor(actor, mappingData);

      // Declaring GLOBAL_PLATFORM_MANAGER here would let
      // `resolveInitiatorRole` attribute an actor the gate above rejects —
      // an audit trail describing a caller that cannot exist.
      const [, , legacyReachers] =
        configurationAuditService.recordChangeForActor.mock.calls[0];
      expect(legacyReachers).not.toContain(
        AuthorizationCredential.GLOBAL_PLATFORM_MANAGER
      );
      expect(legacyReachers).toEqual(
        expect.arrayContaining([
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
          AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
        ])
      );
    });
  });
});
