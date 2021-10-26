import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver, Subscription } from '@nestjs/graphql';
import { ClientProxy } from '@nestjs/microservices';
import { SUBSCRIPTION_PUB_SUB } from '@services/platform/subscription/subscription.module';
import { PubSubEngine } from 'apollo-server-express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ApplicationReceived } from '../application/application.dto.received';
import { CommunityService } from './community.service';

@Resolver()
export class CommunityResolverSubscriptions {
  constructor(
    @Inject(SUBSCRIPTION_PUB_SUB) private pubSub: PubSubEngine,
    private communityService: CommunityService,
    private authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject('NOTIFICATIONS_SERVICE') private client: ClientProxy
  ) {}

  @UseGuards(GraphqlGuard)
  @Subscription(() => ApplicationReceived, {
    description: 'Receive new applications with filtering.',
    async filter(
      this: CommunityResolverSubscriptions,
      payload: ApplicationReceived,
      variables: any,
      context: any
    ) {
      this.logger.verbose?.(
        `variable: communityID = ${variables.communityID}`,
        LogContext.COMMUNITY
      );
      this.logger.verbose?.(`context: ${context}`, LogContext.COMMUNITY);
      return payload.communityID === variables.communityID;
    },
  })
  async applicationReceived(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('communityID') communityID: string
  ) {
    // Note: can do authorization etc here, if can get the current user.
    // E.g. require community ID and then check if the user is authorized to subscribe to that community.
    this.logger.verbose?.(
      `Subscription: user (${agentInfo.email}) wishes to access application events on Community: ${communityID}`,
      LogContext.COMMUNITY
    );
    const community = await this.communityService.getCommunityOrFail(
      communityID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.UPDATE,
      `subscribe to application events on community: ${community.displayName}`
    );
    return this.pubSub.asyncIterator(
      SubscriptionType.COMMUNITY_APPLICATION_CREATED
    );
  }
}
