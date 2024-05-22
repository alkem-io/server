import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver, Subscription } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PubSubEngine } from 'graphql-subscriptions';
import { LogContext } from '@common/enums/logging.context';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SUBSCRIPTION_DISCUSSION_UPDATED } from '@common/constants/providers';
import { IDiscussion } from '../discussion/discussion.interface';
import { DiscussionService } from '../discussion/discussion.service';
import { CommunicationService } from './communication.service';
import { CommunicationDiscussionUpdated } from './dto/communication.dto.event.discussion.updated';
import { UUID_LENGTH } from '@common/constants';
import { SubscriptionUserNotAuthenticated } from '@common/exceptions/subscription.user.not.authenticated';

@Resolver()
export class CommunicationResolverSubscriptions {
  constructor(
    private authorizationService: AuthorizationService,
    private communicationService: CommunicationService,
    private discussionService: DiscussionService,
    @Inject(SUBSCRIPTION_DISCUSSION_UPDATED)
    private subscriptionDiscussionUpdated: PubSubEngine,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Subscription(() => IDiscussion, {
    description: 'Receive updates on Discussions',
    async resolve(
      this: CommunicationResolverSubscriptions,
      payload: CommunicationDiscussionUpdated,
      _: any,
      context: any
    ): Promise<IDiscussion> {
      const agentInfo = context.req?.user;
      this.logger.verbose?.(
        `[User (${agentInfo.email}) Discussion Update] - Sending out event: ${payload.eventID} `,
        LogContext.SUBSCRIPTIONS
      );
      return await this.discussionService.getDiscussionOrFail(
        payload.discussionID
      );
    },
    async filter(
      this: CommunicationResolverSubscriptions,
      payload: CommunicationDiscussionUpdated,
      variables: any,
      context: any
    ) {
      const agentInfo = context.req?.user;
      const isMatch = await this.discussionService.isDiscussionInCommunication(
        payload.discussionID,
        variables.communicationID
      );
      this.logger.verbose?.(
        `[User (${agentInfo.email}) Discussion Update] - Filtering event id '${payload.eventID}' - match? ${isMatch}`,
        LogContext.SUBSCRIPTIONS
      );
      return isMatch;
    },
  })
  async communicationDiscussionUpdated(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'communicationID',
      type: () => UUID,
      description:
        'The IDs of the Communication to subscribe to all updates on.',
    })
    communicationID: string
  ) {
    // Only allow subscriptions for logged in users
    if (agentInfo.userID.length !== UUID_LENGTH) {
      throw new SubscriptionUserNotAuthenticated(
        'Subscription attempted to DiscussionsUpdated for non-authenticated user',
        LogContext.SUBSCRIPTIONS
      );
    }
    const logMsgPrefix = `[User (${agentInfo.email}) Discussion Update] - `;
    this.logger.verbose?.(
      `${logMsgPrefix} Subscribing to Discussions on Communication: ${communicationID}`,
      LogContext.SUBSCRIPTIONS
    );

    const communication =
      await this.communicationService.getCommunicationOrFail(communicationID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      communication.authorization,
      AuthorizationPrivilege.READ,
      `subscription to discussion updates on: ${communication.id}`
    );

    return this.subscriptionDiscussionUpdated.asyncIterator(
      SubscriptionType.COMMUNICATION_DISCUSSION_UPDATED
    );
  }
}
