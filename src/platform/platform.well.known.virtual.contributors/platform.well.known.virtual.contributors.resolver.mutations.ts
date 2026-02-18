import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
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
    private platformWellKnownVirtualContributorsService: PlatformWellKnownVirtualContributorsService
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
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `set Platform well-known Virtual Contributor: ${actorContext.actorId}`
    );

    const mappingsRecord =
      await this.platformWellKnownVirtualContributorsService.setMapping(
        mappingData.wellKnown,
        mappingData.virtualContributorID
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
