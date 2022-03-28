import { Resolver, Subscription } from '@nestjs/graphql';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  CurrentUser,
  LogContext,
  SUBSCRIPTION_PROFILE_VERIFIED_CREDENTIAL,
} from '@src/common';
import { PubSubEngine } from 'graphql-subscriptions';
import { AgentInfo, GraphqlGuard } from '@src/core';
import { ProfileCredentialVerified } from '@domain/common/agent/agent.dto.profile.credential.verified';
import { SubscriptionType } from '@common/enums/subscription.type';

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
      value: ProfileCredentialVerified
    ): Promise<ProfileCredentialVerified> {
      this.logger.verbose?.(
        `[ProfileCredentialVerified Resolve] sending out event for Profile: ${value.vc} `,
        LogContext.SUBSCRIPTIONS
      );
      return value;
    },
    async filter(
      this: AgentResolverSubscriptions,
      payload: ProfileCredentialVerified,
      variables: any,
      context: any
    ): Promise<boolean> {
      return true;
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
