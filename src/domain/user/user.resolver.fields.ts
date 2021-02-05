import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { Roles } from '@utils/decorators/roles.decorator';
import { GqlAuthGuard } from '@utils/auth/graphql.guard';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { User } from '@domain/user/user.entity';
import { UserService } from './user.service';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { MemberOf } from './memberof.composite';

@Resolver(() => User)
export class UserResolverFields {
  constructor(private userService: UserService) {}

  @Roles(RestrictedGroupNames.Members)
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
