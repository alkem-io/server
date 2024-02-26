import { Resolver, Subscription } from '@nestjs/graphql';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@src/common/enums';
import { PubSubEngine } from 'graphql-subscriptions';
import { AgentInfo } from '@core/authentication.agent.info/agent-info';
import { ProfileCredentialVerified } from '@domain/agent/agent/dto/agent.dto.profile.credential.verified';
import { SubscriptionType } from '@common/enums/subscription.type';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { SUBSCRIPTION_PROFILE_VERIFIED_CREDENTIAL } from '@common/constants/providers';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@Resolver()
export class AgentResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_PROFILE_VERIFIED_CREDENTIAL)
    private subscriptionVerifiedCredentials: PubSubEngine
  ) {}

  @UseGuards(GraphqlGuard)
  @Subscription(() => ProfileCredentialVerified, {
    description: 'Received on verified credentials change',
    async resolve(
      this: AgentResolverSubscriptions,
      payload: ProfileCredentialVerified,
      _: any,
      context: any
    ): Promise<ProfileCredentialVerified> {
      const agentInfo = context.req?.user;
      const logMsgPrefix = `[User (${agentInfo.email}) VC added] - `;
      this.logger.verbose?.(
        `${logMsgPrefix} Sending out event: ${payload.vc} `,
        LogContext.SUBSCRIPTIONS
      );

      return payload;
    },
    async filter(
      this: AgentResolverSubscriptions,
      payload: ProfileCredentialVerified,
      variables: any,
      context: any
    ): Promise<boolean> {
      const agentInfo: AgentInfo = context.req?.user;
      const isMatch = payload.userEmail === agentInfo.email;

      this.logger.verbose?.(
        `[User (${agentInfo.email}) VC Added] - Filtering event id '${payload.eventID}' - match? ${isMatch}`,
        LogContext.SUBSCRIPTIONS
      );
      return isMatch;
    },
  })
  async profileVerifiedCredential(@CurrentUser() agentInfo: AgentInfo) {
    this.logger.verbose?.(
      `User (${agentInfo.email}) subscribing to his credential updates`,
      LogContext.SUBSCRIPTIONS
    );

    return this.subscriptionVerifiedCredentials.asyncIterator(
      SubscriptionType.PROFILE_VERIFIED_CREDENTIAL
    );
  }
}
