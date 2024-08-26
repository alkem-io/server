import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AuthorizationPrivilege } from '@common/enums';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@Resolver()
export class AdminSearchContributorsMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private contributorService: ContributorService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => String, {
    description:
      'Update the Avatar on the Profile with the spedified profileID to be stored as a Document.',
  })
  async adminUpdateContributorAvatars(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('profileID', { type: () => UUID }) profileID: string
  ) {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `Update contributor avatars to be stored as Documents: ${agentInfo.email}`
    );

    await this.contributorService.ensureAvatarIsStoredInLocalStorageBucket(
      profileID,
      agentInfo.userID
    );
  }
}
