import { UseGuards } from '@nestjs/common';
import { Args, Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { Organization } from './organization.entity';
import { OrganizationService } from './organization.service';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IOrganization } from '@domain/community/organization';
import { IUserGroup } from '@domain/community/user-group';
import { IUser } from '@domain/community/user';
import { IProfile } from '@domain/community/profile';
import { AuthorizationAgentPrivilege, Profiling } from '@common/decorators';
import { IAgent } from '@domain/agent/agent';
import { UUID } from '@domain/common/scalars';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
@Resolver(() => IOrganization)
export class OrganizationResolverFields {
  constructor(
    private organizationService: OrganizationService,
    private groupService: UserGroupService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: true,
    description: 'Groups defined on this organization.',
  })
  @Profiling.api
  async groups(@Parent() organization: Organization) {
    return await this.organizationService.getUserGroups(organization);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('group', () => IUserGroup, {
    nullable: true,
    description: 'Group defined on this organization.',
  })
  @Profiling.api
  async group(
    @Parent() organization: Organization,
    @Args('ID', { type: () => UUID }) groupID: string
  ): Promise<IUserGroup> {
    return await this.groupService.getUserGroupOrFail(groupID, {
      where: { organization: organization },
    });
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('members', () => [IUser], {
    nullable: true,
    description: 'All users that are members of this Organization.',
  })
  @Profiling.api
  async members(@Parent() organization: Organization) {
    return await this.organizationService.getMembers(organization);
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The profile for this organization.',
  })
  @Profiling.api
  async profile(@Parent() organization: Organization) {
    const profile = organization.profile;
    if (!profile) {
      throw new EntityNotInitializedException(
        `Profile not initialised on organization: ${organization.displayName}`,
        LogContext.COMMUNITY
      );
    }

    return organization.profile;
  }

  @ResolveField('agent', () => IAgent, {
    nullable: true,
    description: 'The Agent representing this User.',
  })
  @Profiling.api
  async agent(@Parent() organization: Organization): Promise<IAgent> {
    return await this.organizationService.getAgent(organization);
  }
}
