import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { Community, ICommunity } from '@domain/community/community';
import { CommunityService } from './community.service';
import { IUser } from '@domain/community/user';
import { IUserGroup } from '@domain/community/user-group';
import { IApplication } from '@domain/community/application';
import { AuthorizationPrivilege } from '@common/enums';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { IOrganization } from '../organization';
import { CommunityRole } from '@common/enums/community.role';
@Resolver(() => ICommunity)
export class CommunityResolverFields {
  constructor(private communityService: CommunityService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: true,
    description: 'Groups of users related to a Community.',
  })
  @Profiling.api
  async groups(@Parent() community: Community) {
    return await this.communityService.getUserGroups(community);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('memberUsers', () => [IUser], {
    nullable: true,
    description: 'All users that are contributing to this Community.',
  })
  @Profiling.api
  async memberUsers(@Parent() community: Community) {
    return await this.communityService.getUsersWithRole(
      community,
      CommunityRole.MEMBER
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('memberOrganizations', () => [IOrganization], {
    nullable: true,
    description: 'All Organizations that are contributing to this Community.',
  })
  @Profiling.api
  async memberOrganizations(@Parent() community: Community) {
    return await this.communityService.getOrganizationsWithRole(
      community,
      CommunityRole.MEMBER
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('leadUsers', () => [IUser], {
    nullable: true,
    description: 'All users that are leads in this Community.',
  })
  @Profiling.api
  async leadUsers(@Parent() community: Community) {
    return await this.communityService.getUsersWithRole(
      community,
      CommunityRole.LEAD
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('leadOrganizations', () => [IOrganization], {
    nullable: true,
    description: 'All Organizations that are leads in this Community.',
  })
  @Profiling.api
  async leadOrganizations(@Parent() community: Community) {
    return await this.communityService.getOrganizationsWithRole(
      community,
      CommunityRole.LEAD
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('applications', () => [IApplication], {
    nullable: true,
    description: 'Application available for this community.',
  })
  @Profiling.api
  async applications(@Parent() community: Community) {
    const apps = await this.communityService.getApplications(community);
    return apps || [];
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('communication', () => ICommunication, {
    nullable: true,
    description: 'The Communications for this Community.',
  })
  @Profiling.api
  async communication(@Parent() community: Community) {
    return await this.communityService.getCommunication(community.id);
  }
}
