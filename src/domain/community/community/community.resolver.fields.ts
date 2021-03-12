import { Application } from '@domain/community/application/application.entity';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { User } from '@domain/community/user/user.entity';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { GroupNotInitializedException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Profiling } from '@src/common/decorators';
import { Community } from './community.entity';
import { CommunityService } from './community.service';

@Resolver(() => Community)
export class CommunityResolverFields {
  constructor(private communityService: CommunityService) {}

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @ResolveField('groups', () => [UserGroup], {
    nullable: true,
    description: 'Groups of users related to a Community.',
  })
  @Profiling.api
  async groups(@Parent() Community: Community) {
    const groups = await this.communityService.loadGroups(Community);
    return groups;
  }

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @ResolveField('members', () => [User], {
    nullable: true,
    description: 'All users that are contributing to this Community.',
  })
  @Profiling.api
  async members(@Parent() Community: Community) {
    const group = await this.communityService.getMembersGroup(Community);
    const members = group.members;
    if (!members)
      throw new GroupNotInitializedException(
        'Members group not initialised on Community',
        LogContext.COMMUNITY
      );
    return members;
  }

  @Roles(
    AuthorizationRoles.GlobalAdmins,
    AuthorizationRoles.EcoverseAdmins,
    AuthorizationRoles.CommunityAdmins
  )
  @UseGuards(GqlAuthGuard)
  @ResolveField('applications', () => [Application], {
    nullable: false,
    description: 'Application available for this community.',
  })
  @Profiling.api
  async applications(@Parent() Community: Community) {
    const apps = await this.communityService.getApplications(Community);
    return apps || [];
  }
}
