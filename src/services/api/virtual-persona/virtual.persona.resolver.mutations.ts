import { UseGuards } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { VirtualPersonaService } from './virtual.persona.service';

@Resolver()
export class VirtualPersonaResolverMutations {
  constructor(private virtualContributorService: VirtualPersonaService) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'Resets the interaction with the chat engine.',
  })
  @Profiling.api
  async resetVirtualContributor(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    return this.virtualContributorService.resetUserHistory(agentInfo);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'Ingest the virtual contributor data / embeddings.',
  })
  @Profiling.api
  async ingest(@CurrentUser() agentInfo: AgentInfo): Promise<boolean> {
    return this.virtualContributorService.ingest(agentInfo);
  }
}
