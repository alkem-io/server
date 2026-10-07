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
 * The resolver pins its own check to the owning role alone. These tests wire the REAL AuthorizationPolicyService +
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
    // `platform-settings-admin` is the OWNING role (spec row 4 owns the
    // well-known VC); an actor holding no platform role is denied.
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
      // The configuration audit row is attributed to the owning role.
      expect(
        configurationAuditService.recordChangeForActor
      ).toHaveBeenCalledWith(
        actor,
        [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
        expect.objectContaining({
          setting: `wellKnownVirtualContributor:${mappingData.wellKnown}`,
          newValue: mappingData.virtualContributorID,
          outcome: 'success',
        })
      );
    });
  });
});
