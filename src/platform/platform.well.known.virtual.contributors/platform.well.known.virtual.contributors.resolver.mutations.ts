import { GLOBAL_POLICY_PLATFORM_WELL_KNOWN_VC_SET } from '@common/constants/authorization/global.policy.constants';
import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { PlatformConfigurationAuditService } from '@src/platform-admin/platform-configuration-audit/platform.configuration.audit.service';
import { PlatformWellKnownVirtualContributorMapping } from './dto/platform.well.known.virtual.contributor.dto.mapping';
import { SetPlatformWellKnownVirtualContributorInput } from './dto/platform.well.known.virtual.contributor.dto.set';
import { IPlatformWellKnownVirtualContributors } from './platform.well.known.virtual.contributors.interface';
import { PlatformWellKnownVirtualContributorsService } from './platform.well.known.virtual.contributors.service';

@InstrumentResolver()
@Resolver()
export class PlatformWellKnownVirtualContributorsResolverMutations {
  /** sec-server-23 fix (2026-07-31): this mutation checks
   * PLATFORM_SETTINGS_ADMIN against THIS resolver-local, hardcoded
   * IN_MEMORY policy rather than the shared platform policy, whose
   * PLATFORM_SETTINGS_ADMIN grant set the A10 consolidation widened to the
   * UNION of the family's pre-feature reachers.
   *
   * This surface's own pre-feature gate was the PLATFORM_ADMIN catch-all,
   * granted to {GLOBAL_ADMIN, GLOBAL_SUPPORT, GLOBAL_LICENSE_MANAGER} — NOT
   * GLOBAL_PLATFORM_MANAGER, which held PLATFORM_SETTINGS_ADMIN and so
   * reached the family's OTHER surfaces. Checking the shared policy would
   * hand it this one too, which is a capability grant, not an additive
   * re-anchoring.
   *
   * Same shape as `emailChangePolicy`
   * (admin.user.email.change.resolver.mutations.ts, sec-server-7) and
   * `accountDeletePolicy` (admin.users.resolver.mutations.ts, sec-server-4).
   * Do NOT replace this with `getPlatformAuthorizationPolicy()` — that IS
   * the widened policy. */
  private wellKnownVirtualContributorSetPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformWellKnownVirtualContributorsService: PlatformWellKnownVirtualContributorsService,
    private readonly platformConfigurationAuditService: PlatformConfigurationAuditService
  ) {
    const policy = new AuthorizationPolicy(AuthorizationPolicyType.IN_MEMORY);
    const rule =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN],
        [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
        GLOBAL_POLICY_PLATFORM_WELL_KNOWN_VC_SET
      );
    this.wellKnownVirtualContributorSetPolicy =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        policy,
        [rule]
      );
  }

  @Mutation(() => IPlatformWellKnownVirtualContributors, {
    description:
      'Set the mapping of a well-known Virtual Contributor to a specific Virtual Contributor UUID.',
  })
  async setPlatformWellKnownVirtualContributor(
    @CurrentActor() actorContext: ActorContext,
    @Args('mappingData')
    mappingData: SetPlatformWellKnownVirtualContributorInput
  ): Promise<IPlatformWellKnownVirtualContributors> {
    // 027-platform-role-redesign (T045, A10): re-anchored off the
    // PLATFORM_ADMIN catch-all onto PLATFORM_SETTINGS_ADMIN. Checked against
    // the resolver-local pin, NOT the shared platform policy — see the
    // sec-server-23 note on `wellKnownVirtualContributorSetPolicy`.
    this.authorizationService.grantAccessOrFail(
      actorContext,
      this.wellKnownVirtualContributorSetPolicy,
      AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN,
      `set Platform well-known Virtual Contributor: ${actorContext.actorID}`
    );

    const mappingsRecord =
      await this.platformWellKnownVirtualContributorsService.setMapping(
        mappingData.wellKnown,
        mappingData.virtualContributorID
      );

    // T058 — A10, single-path surface. The legacy-reacher list matches the
    // PIN above, not the A10 family union: GLOBAL_PLATFORM_MANAGER cannot
    // reach this mutation (sec-server-23), so declaring it here would let
    // `resolveInitiatorRole` attribute a caller the gate rejects.
    await this.platformConfigurationAuditService.recordChangeForActor(
      actorContext,
      [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
      [],
      {
        setting: `wellKnownVirtualContributor:${mappingData.wellKnown}`,
        newValue: mappingData.virtualContributorID,
        outcome: 'success',
      }
    );

    // Convert from Record format to DTO array format
    const mappingsArray: PlatformWellKnownVirtualContributorMapping[] =
      Object.entries(mappingsRecord || {}).map(
        ([wellKnown, virtualContributorID]) => ({
          wellKnown: wellKnown as VirtualContributorWellKnown,
          virtualContributorID: virtualContributorID as string,
        })
      );

    return { mappings: mappingsArray };
  }
}
