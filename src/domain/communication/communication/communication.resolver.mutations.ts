import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { CommunicationService } from './communication.service';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { IDiscussion } from '../discussion/discussion.interface';
import { CommunicationCreateDiscussionInput } from './dto/communication.dto.create.discussion';
import { DiscussionService } from '../discussion/discussion.service';
import { DiscussionAuthorizationService } from '../discussion/discussion.service.authorization';
import { SUBSCRIPTION_DISCUSSION_UPDATED } from '@common/constants/providers';
import { PubSubEngine } from 'graphql-subscriptions';
import { CommunicationDiscussionUpdated } from './dto/communication.dto.event.discussion.updated';
import { SubscriptionType } from '@common/enums/subscription.type';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationInputDiscussionCreated } from '@services/adapters/notification-adapter/dto/notification.dto.input.discussion.created';
import { COMMUNICATION_PLATFORM_HUBID } from '@common/constants';

@Resolver()
export class CommunicationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private notificationAdapter: NotificationAdapter,
    private communicationService: CommunicationService,
    private discussionAuthorizationService: DiscussionAuthorizationService,
    private discussionService: DiscussionService,
    @Inject(SUBSCRIPTION_DISCUSSION_UPDATED)
    private readonly subscriptionDiscussionMessage: PubSubEngine,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IDiscussion, {
    description: 'Creates a new Discussion as part of this Communication.',
  })
  async createDiscussion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('createData') createData: CommunicationCreateDiscussionInput
  ): Promise<IDiscussion> {
    const communication =
      await this.communicationService.getCommunicationOrFail(
        createData.communicationID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      communication.authorization,
      AuthorizationPrivilege.CREATE_DISCUSSION,
      `create discussion on communication: ${communication.id}`
    );

    const discussion = await this.communicationService.createDiscussion(
      createData,
      agentInfo.userID,
      agentInfo.communicationID
    );

    const savedDiscussion = await this.discussionService.save(discussion);
    await this.discussionAuthorizationService.applyAuthorizationPolicy(
      discussion,
      communication.authorization
    );

    if (communication.hubID !== COMMUNICATION_PLATFORM_HUBID) {
      // Send the notification
      const notificationInput: NotificationInputDiscussionCreated = {
        triggeredBy: agentInfo.userID,
        discussion: discussion,
      };
      await this.notificationAdapter.discussionCreated(notificationInput);
    }

    // Send out the subscription event
    const eventID = `discussion-message-updated-${Math.floor(
      Math.random() * 100
    )}`;
    const subscriptionPayload: CommunicationDiscussionUpdated = {
      eventID: eventID,
      discussionID: discussion.id,
    };
    this.logger.verbose?.(
      `[Discussion updated] - event published: '${eventID}'`,
      LogContext.SUBSCRIPTIONS
    );
    this.subscriptionDiscussionMessage.publish(
      SubscriptionType.COMMUNICATION_DISCUSSION_UPDATED,
      subscriptionPayload
    );

    return savedDiscussion;
  }
}
