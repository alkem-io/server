import { Inject, LoggerService } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CurrentUser, TypedSubscription } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { ForbiddenException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { ConversationEventSubscriptionResult } from './dto/subscription';
import { ConversationEventSubscriptionPayload } from '@services/subscriptions/subscription-service/dto';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class ConversationEventResolverSubscription {
  constructor(
    private subscriptionService: SubscriptionReadService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @TypedSubscription<ConversationEventSubscriptionPayload, never>(
    () => ConversationEventSubscriptionResult,
    {
      description:
        'Receive conversation events for the authenticated user. Includes new conversations, messages, and read receipts.',
      async filter(
        this: ConversationEventResolverSubscription,
        payload,
        _variables,
        context
      ) {
        const agentInfo = context.req?.user;

        // Guard against missing user context
        if (!agentInfo) {
          this.logger.verbose?.(
            `[Conversation Events] Filtering event ${payload.eventID}: no user context, rejecting`,
            LogContext.SUBSCRIPTIONS
          );
          return false;
        }

        // User must be a member of the conversation
        const isMember = payload.memberAgentIds.includes(agentInfo.agentID);

        this.logger.verbose?.(
          `[Conversation Events] Filtering event ${payload.eventID} for user ${agentInfo.userID}: member=${isMember}`,
          LogContext.SUBSCRIPTIONS
        );

        return isMember;
      },
      resolve(payload) {
        return {
          conversationCreated: payload.conversationCreated,
          messageReceived: payload.messageReceived,
          messageRemoved: payload.messageRemoved,
          readReceiptUpdated: payload.readReceiptUpdated,
        };
      },
    }
  )
  public async conversationEvents(@CurrentUser() agentInfo: AgentInfo) {
    if (!agentInfo.userID) {
      throw new ForbiddenException(
        'User could not be resolved',
        LogContext.COMMUNICATION_CONVERSATION,
        { agentInfo }
      );
    }

    this.logger.verbose?.(
      `[Conversation Events] User ${agentInfo.userID} subscribed to conversation events`,
      LogContext.SUBSCRIPTIONS
    );

    return this.subscriptionService.subscribeToConversationEvents();
  }
}
