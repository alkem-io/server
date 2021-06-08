import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { User } from '@domain/community/user/user.entity';
import { UserService } from './user.service';
import { IAgent } from '@domain/agent/agent';
import { AuthorizationAgentPrivilege, Profiling } from '@common/decorators';
import { IUser } from '@domain/community/user';
import { AuthorizationPrivilege } from '@common/enums';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';

@Resolver(() => IUser)
export class UserResolverFields {
  constructor(private userService: UserService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('agent', () => IAgent, {
    nullable: true,
    description: 'The Agent representing this User.',
  })
  @Profiling.api
  async agent(@Parent() user: User): Promise<IAgent> {
    return await this.userService.getAgent(user);
  }
}
