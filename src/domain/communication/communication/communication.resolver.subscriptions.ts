import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AgentInfo } from '@core/authentication/agent-info';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Resolver, Subscription } from '@nestjs/graphql';
import { SUBSCRIPTION_PUB_SUB } from '@core/microservices/microservices.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PubSubEngine } from 'graphql-subscriptions';
import { CommunicationUpdateMessageReceived } from './dto/communication.dto.updates.message.received';
import { CommunicationEventMessageReceived } from '@domain/communication/communication/dto/communication.dto.event.message.received';
import { IdentityResolverService } from '../identity-resolver/identity.resolver.service';
import { CommunicationSubscriptionException } from '@common/exceptions/communication.subscription.exception';
import { LogContext } from '@common/enums/logging.context';
import { CommunicationDiscussionMessageReceived } from './dto/communication.dto.discussion.message.received';

@Resolver()
export class CommunicationResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_PUB_SUB) private pubSub: PubSubEngine,
    private identityResolverService: IdentityResolverService
  ) {}

  // Note: the resolving method should not be doing any heavy lifting.
  // Relies on users being cached for performance.
  @UseGuards(GraphqlGuard)
  @Subscription(() => CommunicationUpdateMessageReceived, {
    description:
      'Receive new Update messages on Communities the currently authenticated User is a member of.',
    async resolve(
      this: CommunicationResolverSubscriptions,
      value: CommunicationEventMessageReceived
    ): Promise<CommunicationUpdateMessageReceived> {
      // Convert from matrix IDs to alkemio User IDs
      const senderID =
        await this.identityResolverService.getUserIDByCommunicationsID(
          value.message.sender
        );
      value.message.sender = senderID;

      // todo: would like to not have to look this up again as it was
      // already done in the filtering...
      const updatesID = await this.identityResolverService.getUpdatesIDByRoomID(
        value.roomId
      );
      if (!updatesID)
        throw new CommunicationSubscriptionException(
          `Unable to resolve the Updates identifier for room: ${value.roomId}`,
          LogContext.SUBSCRIPTIONS
        );

      const result = {
        updatesID: updatesID,
        message: value.message,
      };
      return result;
    },
    async filter(
      this: CommunicationResolverSubscriptions,
      payload: CommunicationEventMessageReceived,
      _: any,
      context: any
    ) {
      // Note: by going through the passport authentication mechanism the "user" property
      // the request will contain the AgentInfo that was authenticated.
      const forCurrentUser =
        payload.communicationID === context.req?.user?.communicationID;
      if (!forCurrentUser) return false;
      // Check if it is a message for an Updates room
      const updatesID = await this.identityResolverService.getUpdatesIDByRoomID(
        payload.roomId
      );
      if (updatesID) return true;
      return false;
    },
  })
  async communicationUpdateMessageReceived(
    @CurrentUser() agentInfo: AgentInfo
  ) {
    this.logger.verbose?.(
      `[Subscription] User update messages for: ${agentInfo.email}`,
      LogContext.SUBSCRIPTIONS
    );
    return this.pubSub.asyncIterator(
      SubscriptionType.COMMUNICATION_MESSAGE_RECEIVED
    );
  }

  // Note: the resolving method should not be doing any heavy lifting.
  // Relies on users being cached for performance.
  @UseGuards(GraphqlGuard)
  @Subscription(() => CommunicationDiscussionMessageReceived, {
    description:
      'Receive new Discussion messages on Communities the currently authenticated User is a member of.',
    async resolve(
      this: CommunicationResolverSubscriptions,
      value: CommunicationEventMessageReceived
    ): Promise<CommunicationDiscussionMessageReceived> {
      // Convert from matrix IDs to alkemio User IDs
      const senderID =
        await this.identityResolverService.getUserIDByCommunicationsID(
          value.message.sender
        );

      value.message.sender = senderID;

      // todo: would like to not have to look this up again as it was
      // already done in the filtering...
      const discussionID =
        await this.identityResolverService.getDiscussionIDByRoomID(
          value.roomId
        );
      if (!discussionID)
        throw new CommunicationSubscriptionException(
          `Unable to resolve the Discussion identifier for room: ${value.roomId}`,
          LogContext.SUBSCRIPTIONS
        );

      const result = {
        discussionID: discussionID,
        message: value.message,
      };
      return result;
    },
    async filter(
      this: CommunicationResolverSubscriptions,
      payload: CommunicationEventMessageReceived,
      _: any,
      context: any
    ) {
      // Note: by going through the passport authentication mechanism the "user" property
      // the request will contain the AgentInfo that was authenticated.
      const forCurrentUser =
        payload.communicationID === context.req?.user?.communicationID;
      if (!forCurrentUser) return false;
      // Check if it is a message for an Updates room
      const discussionID =
        await this.identityResolverService.getDiscussionIDByRoomID(
          payload.roomId
        );
      if (discussionID) return true;
      return false;
    },
  })
  async communicationDiscussionMessageReceived(
    @CurrentUser() agentInfo: AgentInfo
  ) {
    this.logger.verbose?.(
      `[Subscription] User discussion messages for: ${agentInfo.email}`,
      LogContext.SUBSCRIPTIONS
    );
    return this.pubSub.asyncIterator(
      SubscriptionType.COMMUNICATION_MESSAGE_RECEIVED
    );
  }
}
