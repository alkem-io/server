import { CurrentActor, TypedSubscription } from '@common/decorators';
import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { Inject, LoggerService } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { ConversationEventSubscriptionPayload } from '@services/subscriptions/subscription-service/dto';
import { InstrumentResolver } from '@src/apm/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IConversation } from './conversation.interface';
import {
  ConversationEventSubscriptionResult,
  ConversationEventType,
} from './dto/subscription';

/**
 * Rehydrate Date fields on a conversation (and its room) that were
 * stringified during AMQP serialization. NestJS's DateTime scalar
 * requires actual Date instances — plain ISO strings cause serialize() to return null.
 */
const rehydrateConversationDates = (
  conversation: IConversation
): IConversation => ({
  ...conversation,
  createdDate: new Date(conversation.createdDate),
  updatedDate: new Date(conversation.updatedDate),
  room: conversation.room
    ? {
        ...conversation.room,
        createdDate: new Date(conversation.room.createdDate),
        updatedDate: new Date(conversation.room.updatedDate),
      }
    : conversation.room,
});

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
        'Receive conversation events for the authenticated user. Includes conversation lifecycle (created, updated, deleted), messages (received, removed), membership changes (member added, removed), and read receipts.',
      async filter(
        this: ConversationEventResolverSubscription,
        payload,
        _variables,
        context
      ) {
        const actorContext = context.req?.user;

        // Guard against missing user context
        if (!actorContext) {
          this.logger.verbose?.(
            `[Conversation Events] Filtering event ${payload.eventID}: no user context, rejecting`,
            LogContext.SUBSCRIPTIONS
          );
          return false;
        }

        // User must be a member of the conversation
        const isMember = payload.memberActorIds.includes(actorContext.actorID);

        this.logger.verbose?.(
          `[Conversation Events] Filtering event ${payload.eventID} for user ${actorContext.actorID}: member=${isMember}`,
          LogContext.SUBSCRIPTIONS
        );

        return isMember;
      },
      resolve(payload) {
        // Determine event type based on which payload field is populated
        let eventType: ConversationEventType;
        if (payload.conversationCreated) {
          eventType = ConversationEventType.CONVERSATION_CREATED;
        } else if (payload.conversationUpdated) {
          eventType = ConversationEventType.CONVERSATION_UPDATED;
        } else if (payload.messageReceived) {
          eventType = ConversationEventType.MESSAGE_RECEIVED;
        } else if (payload.messageRemoved) {
          eventType = ConversationEventType.MESSAGE_REMOVED;
        } else if (payload.memberAdded) {
          eventType = ConversationEventType.MEMBER_ADDED;
        } else if (payload.memberRemoved) {
          eventType = ConversationEventType.MEMBER_REMOVED;
        } else if (payload.conversationDeleted) {
          eventType = ConversationEventType.CONVERSATION_DELETED;
        } else {
          eventType = ConversationEventType.READ_RECEIPT_UPDATED;
        }

        return {
          eventType,
          conversationCreated: payload.conversationCreated
            ? {
                ...payload.conversationCreated,
                conversation: rehydrateConversationDates(
                  payload.conversationCreated.conversation
                ),
              }
            : undefined,
          conversationUpdated: payload.conversationUpdated
            ? {
                ...payload.conversationUpdated,
                conversation: rehydrateConversationDates(
                  payload.conversationUpdated.conversation
                ),
              }
            : undefined,
          messageReceived: payload.messageReceived,
          messageRemoved: payload.messageRemoved,
          readReceiptUpdated: payload.readReceiptUpdated
            ? {
                roomId: payload.readReceiptUpdated.roomId,
                lastReadEventId: payload.readReceiptUpdated.lastReadMessageId,
              }
            : undefined,
          memberAdded: payload.memberAdded
            ? {
                ...payload.memberAdded,
                conversation: rehydrateConversationDates(
                  payload.memberAdded.conversation
                ),
              }
            : undefined,
          memberRemoved: payload.memberRemoved
            ? {
                ...payload.memberRemoved,
                conversation: rehydrateConversationDates(
                  payload.memberRemoved.conversation
                ),
              }
            : undefined,
          conversationDeleted: payload.conversationDeleted,
        };
      },
    }
  )
  public async conversationEvents(@CurrentActor() actorContext: ActorContext) {
    if (!actorContext.actorID) {
      throw new ForbiddenException(
        'User could not be resolved',
        LogContext.COMMUNICATION_CONVERSATION,
        { actorContext }
      );
    }

    this.logger.verbose?.(
      `[Conversation Events] User ${actorContext.actorID} subscribed to conversation events`,
      LogContext.SUBSCRIPTIONS
    );

    return this.subscriptionService.subscribeToConversationEvents();
  }
}
