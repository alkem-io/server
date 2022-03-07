import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { IUser } from '@domain/community/user';
import { AgentInfo } from '@core/authentication';
import {
  BeginCredentialOfferOutput,
  BeginCredentialRequestOutput,
} from '@domain/agent/credential/credential.dto.interactions';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AlkemioUserClaim } from '@services/platform/trust-registry-adapter/claim/claim.entity';

@Resolver(() => IUser)
export class UserResolverMutations {
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
