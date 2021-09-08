import { LogContext } from '@common/enums';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Resolver, Subscription } from '@nestjs/graphql';
import { APPLICATION_RECEIVED } from '@services/platform/subscription/subscription.events';
import { PUB_SUB } from '@services/platform/subscription/subscription.module';
import { PubSub } from 'apollo-server-express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ApplicationReceived } from '../application/application.dto.received';
import { ApplicationService } from '../application/application.service';

@Resolver()
export class CommunityResolverSubscriptions {
  constructor(
    @Inject(PUB_SUB) private pubSub: PubSub,
    private applicationService: ApplicationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  // The guard does not operate correctly when the connection is established through a WS
  // See app.module.ts for more information
  // @UseGuards(GraphqlGuard)
  @Subscription(() => ApplicationReceived, {
    description: 'Receive new applications with filtering.',
    async resolve(
      this: CommunityResolverSubscriptions,
      value: ApplicationReceived
    ) {
      return value;
    },
    async filter(
      this: CommunityResolverSubscriptions,
      payload: ApplicationReceived,
      variables: any,
      _: any
    ) {
      this.logger.verbose?.(
        `variable: communityID = ${variables.communityID}`,
        LogContext.COMMUNITY
      );
      return payload.userNameID === variables.title;
    },
  })
  applicationReceivedFiltered(
    //@CurrentUser() agentInfo: AgentInfo,
    @Args('title') communityID: string
  ) {
    // Note: can do authorization etc here, if can get the current user.
    // E.g. require community ID and then check if the user is authorized to subscribe to that community.
    // And then if thin
    this.logger.verbose?.(
      `Subscription: is user authorized to access community events with ID: ${communityID}`,
      LogContext.COMMUNITY
    );
    return this.pubSub.asyncIterator(APPLICATION_RECEIVED);
  }

  @Subscription(() => ApplicationReceived, {
    description: 'Receive new applications without filtering.',
    resolve: value => {
      return value;
    },
  })
  applicationReceivedSimple() {
    return this.pubSub.asyncIterator(APPLICATION_RECEIVED);
  }
}
