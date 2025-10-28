import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { CurrentUser } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AuthorizationPrivilege } from '@common/enums';
import { PlatformWellKnownVirtualContributorsService } from './platform.well.known.virtual.contributors.service';
import { IPlatformWellKnownVirtualContributors } from './platform.well.known.virtual.contributors.interface';
import { SetPlatformWellKnownVirtualContributorInput } from './dto/platform.well.known.virtual.contributor.dto.set';
import { InstrumentResolver } from '@src/apm/decorators';

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
    @CurrentUser() agentInfo: AgentInfo,
    @Args('mappingData')
    mappingData: SetPlatformWellKnownVirtualContributorInput
  ): Promise<IPlatformWellKnownVirtualContributors> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `set Platform well-known Virtual Contributor: ${agentInfo.email}`
    );

    return await this.platformWellKnownVirtualContributorsService.setMapping(
      mappingData.wellKnown,
      mappingData.virtualContributorID
    );
  }

  @Query(() => IPlatformWellKnownVirtualContributors, {
    description: 'Get all well-known Virtual Contributor mappings.',
  })
  async platformWellKnownVirtualContributors(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IPlatformWellKnownVirtualContributors> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ,
      `get Platform well-known Virtual Contributors: ${agentInfo.email}`
    );

    return await this.platformWellKnownVirtualContributorsService.getMappings();
  }
}
