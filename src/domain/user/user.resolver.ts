import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { MemberOf } from './memberof.composite';
import { User } from './user.entity';
import { UserService } from './user.service';

@Resolver(() => User)
export class UserResolver {
  constructor(private userService: UserService) {}

  @ResolveField('memberof', () => MemberOf, {
    nullable: true,
    description: 'An overview of the groups this user is a memberof',
  })
  async membership(@Parent() user: User) {
    const memberships = await this.userService.getMemberOf(user);
    // Find all challenges the user is a member of
    return memberships;
  }
}
