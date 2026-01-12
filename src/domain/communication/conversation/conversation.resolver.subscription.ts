import { Resolver, Int } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser, TypedSubscription } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { ConversationsUnreadCountSubscriptionPayload } from '@services/subscriptions/subscription-service/dto';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { ForbiddenException } from '@common/exceptions';
import { LogContext } from '@common/enums';

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
}
