import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UserGroup } from '../user-group/user-group.entity';
import { MemberOf } from './user.dto';
import { User } from './user.entity';

@Resolver(() => User)
export class UserResolver {
  @ResolveField('memberof', returns => MemberOf, {
    nullable: true,
    description: 'An overview of the groups this user is a memberof',
  })
  membership(@Parent() user: User) {
    const memberOf = new MemberOf();
    memberOf.email = user.email;
    memberOf.groups = [];
    memberOf.challenges = [];

    if (user.userGroups) {
      // Find all top level groups
      let i;
      const count = user.userGroups.length;
      for (i = 0; i < count; i++) {
        const group = user.userGroups[i];

        // check if the group is an ecoverse group
        if (group.ecoverse) {
          // ecoverse group
          memberOf.groups.push(group);
        }
        if (group.challenge) {
          // challenge group
          memberOf.challenges.push(group.challenge);
        }
      }
    }

    // Find all challenges the user is a member of
    return memberOf;
  }
}
