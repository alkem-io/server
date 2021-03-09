import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { Roles } from '@common/decorators/roles.decorator';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Profiling } from '@src/common/decorators';
import { User } from '@domain/community/user/user.entity';
import { UserService } from './user.service';
import { MemberOf } from './memberof.composite';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';

@Resolver(() => User)
export class UserResolverFields {
  constructor(private userService: UserService) {}

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @ResolveField('memberof', () => MemberOf, {
    nullable: true,
    description:
      'An overview of the groups this user is a memberof. Note: all groups are returned without members to avoid recursion.',
  })
  @Profiling.api
  async membership(@Parent() user: User) {
    const memberships = await this.userService.getMemberOf(user);
    // Find all challenges the user is a member of
    return memberships;
  }
}
