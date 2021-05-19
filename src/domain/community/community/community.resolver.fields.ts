import {
  AuthorizationCommunityMember,
  GraphqlGuard,
} from '@core/authorization';
import { AuthorizationRolesGlobal } from '@core/authorization/authorization.roles.global';
import { IUserGroup } from '@domain/community/user-group';
import { IApplication } from '@domain/community/application';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationGlobalRoles, Profiling } from '@src/common/decorators';
import { Community, ICommunity } from '@domain/community/community';
import { CommunityService } from './community.service';
import { IUser } from '@domain/community/user';

@Resolver(() => ICommunity)
export class CommunityResolverFields {
  constructor(private communityService: CommunityService) {}

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.Admin,
    AuthorizationRolesGlobal.CommunityAdmin
  )
  @AuthorizationCommunityMember()
  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: true,
    description: 'Groups of users related to a Community.',
  })
  @Profiling.api
  async groups(@Parent() community: Community) {
    return await this.communityService.getUserGroups(community);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.Admin,
    AuthorizationRolesGlobal.CommunityAdmin
  )
  @AuthorizationCommunityMember()
  @UseGuards(GraphqlGuard)
  @ResolveField('members', () => [IUser], {
    nullable: true,
    description: 'All users that are contributing to this Community.',
  })
  @Profiling.api
  async members(@Parent() community: Community) {
    return await this.communityService.getMembers(community);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.Admin,
    AuthorizationRolesGlobal.CommunityAdmin
  )
  @AuthorizationCommunityMember()
  @UseGuards(GraphqlGuard)
  @ResolveField('applications', () => [IApplication], {
    nullable: false,
    description: 'Application available for this community.',
  })
  @Profiling.api
  async applications(@Parent() community: Community) {
    const apps = await this.communityService.getApplications(community);
    return apps || [];
  }
}
