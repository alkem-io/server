import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Roles } from '@common/decorators/roles.decorator';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { UserGroup } from './user-group.entity';
import { IUserGroup } from './user-group.interface';
import { UserGroupService } from './user-group.service';
import { Profiling } from '@src/common/decorators';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';

@Resolver(() => UserGroup)
export class UserGroupResolverQueries {
  constructor(private groupService: UserGroupService) {}

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @Query(() => [UserGroup], {
    nullable: false,
    description: 'The user groups on this platform',
  })
  @Profiling.api
  async groups(): Promise<IUserGroup[]> {
    return await this.groupService.getGroups();
  }

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @Query(() => [UserGroup], {
    nullable: false,
    description: 'All groups that have the provided tag',
  })
  @Profiling.api
  async groupsWithTag(@Args('tag') tag: string): Promise<IUserGroup[]> {
    return await this.groupService.getGroupsWithTag(tag);
  }

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @Query(() => UserGroup, {
    nullable: false,
    description:
      'The user group with the specified id anywhere in the ecoverse',
  })
  @Profiling.api
  async group(@Args('ID') id: number): Promise<IUserGroup> {
    const group = await this.groupService.getUserGroupOrFail(id, {
      relations: ['members', 'focalPoint'],
    });
    return group;
  }
}
