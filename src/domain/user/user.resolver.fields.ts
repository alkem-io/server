import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { Roles } from '@utils/authorisation/roles.decorator';
import { GqlAuthGuard } from '@utils/authorisation/graphql.guard';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { User } from '@domain/user/user.entity';
import { UserService } from './user.service';
import { MemberOf } from './memberof.composite';
import { AuthorisationRoles } from '@utils/authorisation/authorisation.roles';

@Resolver(() => User)
export class UserResolverFields {
  constructor(private userService: UserService) {}

  @Roles(AuthorisationRoles.Members)
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
