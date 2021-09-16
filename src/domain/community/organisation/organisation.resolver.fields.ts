import { UseGuards } from '@nestjs/common';
import { Args, Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { Organisation } from './organisation.entity';
import { OrganisationService } from './organisation.service';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IOrganisation } from '@domain/community/organisation';
import { IUserGroup } from '@domain/community/user-group';
import { IUser } from '@domain/community/user';
import { IProfile } from '@domain/community/profile';
import { AuthorizationAgentPrivilege, Profiling } from '@common/decorators';
import { IAgent } from '@domain/agent/agent';
import { UUID } from '@domain/common/scalars';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { IOrganizationVerification } from './verification/organization.verification.interface';
@Resolver(() => IOrganisation)
export class OrganisationResolverFields {
  constructor(
    private organisationService: OrganisationService,
    private groupService: UserGroupService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: true,
    description: 'Groups defined on this organisation.',
  })
  @Profiling.api
  async groups(@Parent() organisation: Organisation) {
    return await this.organisationService.getUserGroups(organisation);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('group', () => IUserGroup, {
    nullable: true,
    description: 'Group defined on this organisation.',
  })
  @Profiling.api
  async group(
    @Parent() organisation: Organisation,
    @Args('ID', { type: () => UUID }) groupID: string
  ): Promise<IUserGroup> {
    return await this.groupService.getUserGroupOrFail(groupID, {
      where: { organisation: organisation },
    });
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('members', () => [IUser], {
    nullable: true,
    description: 'All users that are members of this Organisation.',
  })
  @Profiling.api
  async members(@Parent() organisation: Organisation) {
    return await this.organisationService.getMembers(organisation);
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The profile for this organisation.',
  })
  @Profiling.api
  async profile(@Parent() organisation: Organisation) {
    const profile = organisation.profile;
    if (!profile) {
      throw new EntityNotInitializedException(
        `Profile not initialised on organisation: ${organisation.displayName}`,
        LogContext.COMMUNITY
      );
    }

    return organisation.profile;
  }

  @ResolveField('verification', () => IOrganizationVerification, {
    nullable: false,
    description: 'The verification handler for this organisation.',
  })
  @Profiling.api
  async verification(@Parent() organisation: Organisation) {
    return await this.organisationService.getVerification(organisation);
  }

  @ResolveField('agent', () => IAgent, {
    nullable: true,
    description: 'The Agent representing this User.',
  })
  @Profiling.api
  async agent(@Parent() organisation: Organisation): Promise<IAgent> {
    return await this.organisationService.getAgent(organisation);
  }
}
