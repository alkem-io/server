import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { User } from '@domain/community/user/user.entity';
import { Organization } from '@domain/community/organization/organization.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';

@Resolver()
export class AdminSearchContributorsMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private contributorService: ContributorService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => String, {
    description:
      'Update all contributor avatars to be stored as Documents. This is an admin only operation to be run once.',
  })
  async adminUpdateContributorAvatars(@CurrentUser() agentInfo: AgentInfo) {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `Update contributor avatars to be stored as Documents: ${agentInfo.email}`
    );

    const users = await this.entityManager.find(User, {
      relations: {
        profile: true,
      },
    });
    for (const user of users) {
      if (user.profile) {
        await this.contributorService.ensureAvatarIsStoredInLocalStorageBucket(
          user.profile,
          user.id
        );
      }
    }
    const organizations = await this.entityManager.find(Organization, {
      relations: {
        profile: true,
      },
    });
    for (const organization of organizations) {
      if (organization.profile) {
        await this.contributorService.ensureAvatarIsStoredInLocalStorageBucket(
          organization.profile,
          organization.id
        );
      }
    }

    const virtualContributors = await this.entityManager.find(
      VirtualContributor,
      {
        relations: {
          profile: true,
        },
      }
    );
    for (const virtualContributor of virtualContributors) {
      if (virtualContributor.profile) {
        await this.contributorService.ensureAvatarIsStoredInLocalStorageBucket(
          virtualContributor.profile,
          virtualContributor.id
        );
      }
    }

    this.logger.verbose?.(
      'Completed updating all contributor avatars',
      LogContext.COMMUNITY
    );
  }
}
