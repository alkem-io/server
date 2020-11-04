import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { GqlAuthGuard } from '../../utils/authentication/graphql.guard';
import { Roles } from '../../utils/decorators/roles.decorator';
import { RestrictedGroupNames } from '../user-group/user-group.entity';
import { MemberOf } from './memberof.composite';
import { CurrentUser } from './user.decorator';
import { UserInput } from './user.dto';
import { User } from './user.entity';
import { IUser } from './user.interface';
import { UserService } from './user.service';

@Resolver(() => User)
export class UserResolver {
  constructor(private userService: UserService) {}

  @ResolveField('memberof', () => MemberOf, {
    nullable: true,
    description:
      'An overview of the groups this user is a memberof. Note: all groups are returned without members to avoid recursion.',
  })
  async membership(@Parent() user: User) {
    const memberships = await this.userService.getMemberOf(user);
    // Find all challenges the user is a member of
    return memberships;
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, {
    description:
      'Update the base user information. Note: email address cannot be updated.',
  })
  async updateUser(
    @Args('userID') userID: number,
    @Args('userData') userData: UserInput
  ): Promise<IUser> {
    const user = await this.userService.updateUser(userID, userData);
    return user;
  }

  @Roles(
    RestrictedGroupNames.Members,
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Query(() => User, {
    nullable: false,
    description: 'The currently logged in user',
  })
  async me(@CurrentUser() email: string): Promise<IUser> {
    const user = await this.userService.getUserByEmail(email);
    return user as IUser;
  }
}
