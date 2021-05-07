import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { AuthorizationGlobalRoles, Profiling } from '@src/common/decorators';
import { User } from '@domain/community/user/user.entity';
import { UserService } from './user.service';
import { MemberOf } from './memberof.composite';
import {
  AuthorizationRolesGlobal,
  AuthorizationRulesGuard,
} from '@core/authorization';
import { Agent, IAgent } from '@domain/agent/agent';

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
  @ResolveField('agent', () => Agent, {
    nullable: true,
    description: 'The Agent representing this User.',
  })
  @Profiling.api
  async agent(@Parent() user: User): Promise<IAgent> {
    return await this.userService.getAgent(user);
  }
}
