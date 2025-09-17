import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';

@Resolver()
export class GuestTestResolver {
  @UseGuards(GraphqlGuard)
  @Query(() => String, {
    description: 'Test query to demonstrate guest functionality',
  })
  async whoAmI(@CurrentUser() agentInfo: AgentInfo): Promise<string> {
    if (agentInfo.guestName) {
      return `Hello, Guest: ${agentInfo.guestName}`;
    } else if (agentInfo.isAnonymous) {
      return 'Hello, Anonymous User';
    } else if (agentInfo.firstName) {
      return `Hello, ${agentInfo.firstName} ${agentInfo.lastName}`;
    } else {
      return 'Hello, Authenticated User';
    }
  }
}
