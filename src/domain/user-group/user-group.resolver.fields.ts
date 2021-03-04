import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { Roles } from '@utils/authorisation/roles.decorator';
import { GqlAuthGuard } from '@utils/authorisation/graphql.guard';
import { UserGroup } from './user-group.entity';
import { UserGroupService } from './user-group.service';
import { UserGroupParent } from './user-group-parent.dto';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { User } from '@domain/user/user.entity';
import { AuthorisationRoles } from '@utils/authorisation/authorisation.roles';

@Resolver(() => UserGroup)
export class UserGroupResolverFields {
  constructor(private userGroupService: UserGroupService) {}

  @Roles(AuthorisationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @ResolveField('parent', () => UserGroupParent, {
    nullable: true,
    description: 'Containing entity for this UserGroup.',
  })
  @Profiling.api
  async parent(@Parent() userGroup: UserGroup) {
    return await this.userGroupService.getParent(userGroup);
  }

  @Roles(AuthorisationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @ResolveField('members', () => User, {
    nullable: true,
    description: 'The Users that are members of this User Group.',
  })
  @Profiling.api
  async members(@Parent() group: UserGroup): Promise<User[]> {
    if (!group || !group.membersPopulationEnabled) return [];

    const members = await this.userGroupService.getMembers(group.id);
    return (members || []) as User[];
  }
}
