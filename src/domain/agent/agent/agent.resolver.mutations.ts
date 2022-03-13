import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AgentService } from '@domain/agent/agent/agent.service';
import { Agent } from './agent.entity';
import { BeginCredentialRequestOutput } from '../credential/dto/credential.request.dto.begin.output';
import { BeginCredentialOfferOutput } from '../credential/dto/credential.offer.dto.begin.output';
import { AlkemioUserClaim } from '@services/platform/trust-registry-adapter/claim/claim.alkemio.user';

@Resolver(() => Agent)
export class AgentResolverMutations {
  constructor(private agentService: AgentService) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => BeginCredentialRequestOutput, {
    nullable: false,
    description: 'Generate credential share request',
  })
  @Profiling.api
  async beginCredentialRequestInteraction(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ name: 'types', type: () => [String] }) types: string[]
  ): Promise<BeginCredentialRequestOutput> {
    return await this.agentService.beginCredentialRequestInteraction(
      agentInfo.agentID,
      types
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => BeginCredentialOfferOutput, {
    description: 'Generate Alkemio user credential offer',
  })
  @Profiling.api
  async beginAlkemioUserCredentialOfferInteraction(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<BeginCredentialOfferOutput> {
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
