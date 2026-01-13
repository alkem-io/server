import { Resolver, Int } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser, TypedSubscription } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import {
  ConversationsUnreadCountSubscriptionPayload,
  UserConversationMessageSubscriptionPayload,
} from '@services/subscriptions/subscription-service/dto';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { ForbiddenException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { UserConversationMessageEventSubscriptionResult } from './dto';

@InstrumentResolver()
@Resolver()
export class ConversationResolverSubscription {
  constructor(private subscriptionService: SubscriptionReadService) {}

  @TypedSubscription<ConversationsUnreadCountSubscriptionPayload, never>(
    () => Int,
    {
      description:
        'Counter of conversations with unread messages for the currently authenticated user.',
      async filter(
        this: ConversationResolverSubscription,
        payload,
        _variables,
        context
      ) {
        const agentInfo = context.req.user;
        return agentInfo?.userID === payload?.receiverID;
      },
      async resolve(
        this: ConversationResolverSubscription,
        payload,
        _args,
        _context
      ) {
        return payload?.count;
      },
    }
  )
  public async conversationsUnreadCount(@CurrentUser() agentInfo: AgentInfo) {
    if (!agentInfo.userID) {
      throw new ForbiddenException(
        'User could not be resolved',
        LogContext.COMMUNICATION,
        { agentInfo }
      );
    }

    return this.subscriptionService.subscribeToConversationsUnreadCount();
  }

  @TypedSubscription<UserConversationMessageSubscriptionPayload, never>(
    () => UserConversationMessageEventSubscriptionResult,
    {
      description:
        'Receive message events for all conversations the authenticated user is a member of.',
      async filter(
        this: ConversationResolverSubscription,
        payload,
        _variables,
        context
      ) {
        const agentInfo = context.req.user;
        return agentInfo?.userID === payload?.receiverID;
      },
      async resolve(
        this: ConversationResolverSubscription,
        payload,
        _args,
        _context
      ): Promise<UserConversationMessageEventSubscriptionResult> {
        return {
          conversationId: payload.conversationId,
          roomId: payload.roomId,
          type: payload.message.type,
          data: payload.message.data,
        };
      },
    }
  )
  public async userConversationMessage(@CurrentUser() agentInfo: AgentInfo) {
    if (!agentInfo.userID) {
      throw new ForbiddenException(
        'User could not be resolved',
        LogContext.COMMUNICATION,
        { agentInfo }
      );
    }

    return this.subscriptionService.subscribeToUserConversationMessage();
  }
}
