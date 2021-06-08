import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { AgentService } from './agent.service';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationAgentPrivilege, Profiling } from '@common/decorators';
import { Agent, IAgent, VerifiedCredential } from '@domain/agent/agent';
import { GraphqlGuard } from '@core/authorization';

@Resolver(() => IAgent)
export class AgentResolverFields {
  constructor(private agentService: AgentService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('verifiedCredentials', () => [VerifiedCredential], {
    nullable: true,
    description: 'The Verfied Credentials for this Agent.',
  })
  @Profiling.api
  async verifiedCredentials(
    @Parent() agent: Agent
  ): Promise<VerifiedCredential[]> {
    return await this.agentService.getVerifiedCredentials(agent);
  }
}
