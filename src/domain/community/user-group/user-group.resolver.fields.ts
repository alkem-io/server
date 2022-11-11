import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { IUser } from '@domain/community/user';
import { UserGroup, IUserGroup } from '@domain/community/user-group';
import { IGroupable } from '@domain/common/interfaces/groupable.interface';
import { AuthorizationPrivilege } from '@common/enums';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';

@Resolver(() => IUserGroup)
export class UserGroupResolverFields {
  constructor(private userGroupService: UserGroupService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('parent', () => IGroupable, {
    nullable: true,
    description: 'Containing entity for this UserGroup.',
  })
  @Profiling.api
  async parent(@Parent() userGroup: UserGroup) {
    return await this.userGroupService.getParent(userGroup);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('members', () => [IUser], {
    nullable: true,
    description: 'The Users that are members of this User Group.',
  })
  @Profiling.api
  async members(@Parent() group: UserGroup): Promise<IUser[]> {
    return await this.userGroupService.getMembers(group.id);
  }
}
