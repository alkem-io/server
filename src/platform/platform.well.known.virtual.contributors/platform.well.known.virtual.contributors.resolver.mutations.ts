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
  /** This mutation checks PLATFORM_SETTINGS_ADMIN against THIS
   * resolver-local, hardcoded IN_MEMORY policy, scoped to the
   * PLATFORM_SETTINGS_ADMIN credential alone, rather than against the shared
   * platform policy.
   *
   * Same shape as `emailChangePolicy`
   * (admin.user.email.change.resolver.mutations.ts) and
   * `accountDeletePolicy` (admin.users.resolver.mutations.ts). */
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

    // A10, single-path surface: Platform Settings Admin is the owning role.
    await this.platformConfigurationAuditService.recordChangeForActor(
      actorContext,
      [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
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
