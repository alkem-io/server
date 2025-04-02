import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AgentService } from '@domain/agent/agent/agent.service';
import { Agent } from './agent.entity';
import { AlkemioUserClaim } from '@services/external/trust-registry/trust.registry.claim/claim.alkemio.user';
import { AgentBeginVerifiedCredentialRequestOutput } from './dto/agent.dto.verified.credential.request.begin.output';
import { AgentBeginVerifiedCredentialOfferOutput } from './dto/agent.dto.verified.credential.offer.begin.output';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver(() => Agent)
export class AgentResolverMutations {
  constructor(private agentService: AgentService) {}

  @Mutation(() => AgentBeginVerifiedCredentialRequestOutput, {
    nullable: false,
    description: 'Generate verified credential share request',
  })
  @Profiling.api
  async beginVerifiedCredentialRequestInteraction(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ name: 'types', type: () => [String] }) types: string[]
  ): Promise<AgentBeginVerifiedCredentialRequestOutput> {
    return await this.agentService.beginCredentialRequestInteraction(
      agentInfo.agentID,
      types
    );
  }

  @Mutation(() => AgentBeginVerifiedCredentialOfferOutput, {
    description: 'Generate Alkemio user credential offer',
  })
  @Profiling.api
  async beginAlkemioUserVerifiedCredentialOfferInteraction(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<AgentBeginVerifiedCredentialOfferOutput> {
    return await this.agentService.beginCredentialOfferInteraction(
      agentInfo.agentID,
      [
        {
          type: 'AlkemioMemberCredential',
          claims: [
            new AlkemioUserClaim({
              userID: agentInfo.userID,
              email: agentInfo.email,
            }),
          ],
        },
      ]
    );
  }
}
