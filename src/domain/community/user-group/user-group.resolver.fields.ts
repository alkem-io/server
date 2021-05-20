import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { UserGroupService } from './user-group.service';
import { Profiling } from '@src/common/decorators';
import { IUser } from '@domain/community/user';
import { UserGroup, IUserGroup } from '@domain/community/user-group';
import { IGroupable } from '../../common/interfaces/groupable.interface';

@Resolver(() => IUserGroup)
export class UserGroupResolverFields {
  constructor(private userGroupService: UserGroupService) {}

  @ResolveField('parent', () => IGroupable, {
    nullable: true,
    description: 'Containing entity for this UserGroup.',
  })
  @Profiling.api
  async parent(@Parent() userGroup: UserGroup) {
    return await this.userGroupService.getParent(userGroup);
  }

  @ResolveField('members', () => [IUser], {
    nullable: true,
    description: 'The Users that are members of this User Group.',
  })
  @Profiling.api
  async members(@Parent() group: UserGroup): Promise<IUser[]> {
    return await this.userGroupService.getMembers(group.id);
  }
}
