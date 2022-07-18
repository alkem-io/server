import { UseGuards } from '@nestjs/common';
import { Args, Context, Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { Organization } from './organization.entity';
import { OrganizationService } from './organization.service';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IOrganization } from '@domain/community/organization';
import { IUserGroup } from '@domain/community/user-group';
import { IUser } from '@domain/community/user';
import { IProfile } from '@domain/community/profile';
import { CurrentUser, Profiling } from '@common/decorators';
import { IAgent } from '@domain/agent/agent';
import { UUID } from '@domain/common/scalars';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { IOrganizationVerification } from '../organization-verification/organization.verification.interface';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { IPreference } from '@domain/common/preference';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { AgentInfo } from '@src/core';
import { AuthorizationService } from '@core/authorization/authorization.service';
@Resolver(() => IOrganization)
export class OrganizationResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private organizationService: OrganizationService,
    private groupService: UserGroupService,
    private preferenceSetService: PreferenceSetService
  ) {}

  //@AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: true,
    description: 'Groups defined on this organization.',
  })
  @Profiling.api
  async groups(
    @Parent() organization: Organization,
    @CurrentUser() agentInfo: AgentInfo
  ) {
    if (
      await this.isAccessGranted(
        organization,
        agentInfo,
        AuthorizationPrivilege.READ
      )
    ) {
      return await this.organizationService.getUserGroups(organization);
    }

    return 'not accessible';
  }

  //@AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('group', () => IUserGroup, {
    nullable: true,
    description: 'Group defined on this organization.',
  })
  @Profiling.api
  async group(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() organization: Organization,
    @Args('ID', { type: () => UUID }) groupID: string
  ): Promise<IUserGroup | 'not accessible'> {
    if (
      await this.isAccessGranted(
        organization,
        agentInfo,
        AuthorizationPrivilege.READ
      )
    ) {
      return await this.groupService.getUserGroupOrFail(groupID, {
        where: { organization: organization },
      });
    }

    return 'not accessible';
  }

  //@AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('members', () => [IUser], {
    nullable: true,
    description: 'All users that are members of this Organization.',
  })
  @Profiling.api
  async members(
    @Parent() organization: Organization,
    @CurrentUser() agentInfo: AgentInfo
  ) {
    if (
      await this.isAccessGranted(
        organization,
        agentInfo,
        AuthorizationPrivilege.READ
      )
    ) {
      return await this.organizationService.getMembers(organization);
    }

    return 'not accessible';
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The profile for this organization.',
  })
  @Profiling.api
  async profile(
    @Parent() organization: Organization,
    @Context() { loaders }: IGraphQLContext
  ) {
    return loaders.orgProfileLoader.load(organization.id);
  }

  @ResolveField('verification', () => IOrganizationVerification, {
    nullable: false,
    description: 'The verification handler for this organization.',
  })
  @Profiling.api
  async verification(@Parent() organization: Organization) {
    return await this.organizationService.getVerification(organization);
  }

  @ResolveField('agent', () => IAgent, {
    nullable: true,
    description: 'The Agent representing this User.',
  })
  @Profiling.api
  async agent(@Parent() organization: Organization): Promise<IAgent> {
    return await this.organizationService.getAgent(organization);
  }

  @ResolveField('activity', () => [INVP], {
    nullable: true,
    description: 'The activity within this Organization.',
  })
  @Profiling.api
  async activity(@Parent() organization: Organization) {
    return await this.organizationService.getActivity(organization);
  }

  //@AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('preferences', () => [IPreference], {
    nullable: false,
    description: 'The preferences for this Organization',
  })
  @UseGuards(GraphqlGuard)
  async preferences(
    @Parent() org: Organization,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IPreference[] | 'not accessible'> {
    if (
      await this.isAccessGranted(org, agentInfo, AuthorizationPrivilege.READ)
    ) {
      const preferenceSet =
        await this.organizationService.getPreferenceSetOrFail(org.id);
      return this.preferenceSetService.getPreferencesOrFail(preferenceSet);
    }

    return 'not accessible';
  }

  private async isAccessGranted(
    organization: IOrganization,
    agentInfo: AgentInfo,
    privilege: AuthorizationPrivilege
  ) {
    // needs to be loaded if you are not going through the orm layer
    // e.g. pagination is going around the orm layer
    const { authorization } =
      await this.organizationService.getOrganizationOrFail(organization.id, {
        relations: ['authorization'],
      });

    return await this.authorizationService.isAccessGranted(
      agentInfo,
      authorization,
      privilege
    );
  }
}
