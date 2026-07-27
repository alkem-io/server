import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { PlatformConfigurationAuditService } from '@src/platform-admin/platform-configuration-audit/platform.configuration.audit.service';
import { PlatformWellKnownVirtualContributorMapping } from './dto/platform.well.known.virtual.contributor.dto.mapping';
import { SetPlatformWellKnownVirtualContributorInput } from './dto/platform.well.known.virtual.contributor.dto.set';
import { IPlatformWellKnownVirtualContributors } from './platform.well.known.virtual.contributors.interface';
import { PlatformWellKnownVirtualContributorsService } from './platform.well.known.virtual.contributors.service';

@InstrumentResolver()
@Resolver()
export class PlatformWellKnownVirtualContributorsResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private platformWellKnownVirtualContributorsService: PlatformWellKnownVirtualContributorsService,
    private readonly platformConfigurationAuditService: PlatformConfigurationAuditService
  ) {}

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
    // PLATFORM_ADMIN catch-all onto PLATFORM_SETTINGS_ADMIN, whose Slice A
    // grant set has been widened to preserve every legacy reacher of this
    // A10 family (platform.service.authorization.ts).
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN,
      `set Platform well-known Virtual Contributor: ${actorContext.actorID}`
    );

    const mappingsRecord =
      await this.platformWellKnownVirtualContributorsService.setMapping(
        mappingData.wellKnown,
        mappingData.virtualContributorID
      );

    // T058 — A10, single-path surface.
    await this.platformConfigurationAuditService.recordChangeForActor(
      actorContext,
      [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
      [
        AuthorizationCredential.GLOBAL_ADMIN,
        AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
        AuthorizationCredential.GLOBAL_SUPPORT,
        AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
      ],
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
