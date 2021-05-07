import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { AuthorizationGlobalRoles, Profiling } from '@src/common/decorators';
import { User } from '@domain/community/user/user.entity';
import { UserService } from './user.service';
import { MemberOf } from './memberof.composite';
import { Credential, ICredential } from '@domain/common/credential';
import {
  AuthorizationRolesGlobal,
  AuthorizationRulesGuard,
} from '@core/authorization';

@Resolver(() => User)
export class UserResolverFields {
  constructor(private userService: UserService) {}

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Registered)
  @UseGuards(AuthorizationRulesGuard)
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

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Registered)
  @UseGuards(AuthorizationRulesGuard)
  @ResolveField('credentials', () => [Credential], {
    nullable: true,
    description:
      'A list of the Credentials that have been assigned to this User.',
  })
  @Profiling.api
  async credentials(@Parent() user: User): Promise<ICredential[]> {
    return await this.userService.getCredentials(user);
  }
}
