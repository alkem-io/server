import { CurrentActor, TypedSubscription } from '@common/decorators';
import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { toRoomReadiness } from '@domain/communication/room/dto/room.readiness';
import { Inject, LoggerService } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { ConversationGovernanceEventSubscriptionPayload } from '@services/subscriptions/subscription-service/dto';
import { InstrumentResolver } from '@src/apm/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IConversation } from './conversation.interface';
import { ConversationGovernanceEvent } from './dto/conversation.governance.event';

/**
 * Rehydrate Date fields stringified during AMQP serialization; the DateTime
 * scalar needs real Date instances.
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

/** Delivery rule: the recipient must be in the member set captured at publish time. */
export const isGovernanceEventForActor = (
  payload: ConversationGovernanceEventSubscriptionPayload,
  actorID: string | undefined
): boolean => !!actorID && payload.memberActorIds.includes(actorID);

/** Wire payload → GraphQL event; dates rehydrated, readiness projected. */
export const toConversationGovernanceEvent = (
  payload: ConversationGovernanceEventSubscriptionPayload
): ConversationGovernanceEvent => {
  const { event } = payload;
  return {
    eventType: event.eventType,
    conversationID: event.conversationID,
    conversation: event.conversation
      ? rehydrateConversationDates(event.conversation)
      : undefined,
    member: event.member,
    memberID: event.memberID,
    readiness: event.readiness ? toRoomReadiness(event.readiness) : undefined,
  };
};

/**
 * The governance-only conversation channel: lifecycle, membership and room
 * readiness outcomes for the subscriber's conversations. Never a message,
 * reaction or read receipt — a browser reading the messaging backend
 * directly must receive each room event exactly once, from the backend.
 */
@InstrumentResolver()
@Resolver()
export class ConversationGovernanceResolverSubscription {
  constructor(
    private subscriptionService: SubscriptionReadService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @TypedSubscription<ConversationGovernanceEventSubscriptionPayload, never>(
    () => ConversationGovernanceEvent,
    {
      description:
        'Receive governance outcomes for the conversations the authenticated user is a member of: created, updated, deleted, member added, member removed, room readiness changed. Carries no message, reaction or read-receipt data — room events are read from the messaging backend directly. Delivered to the members of the affected conversation (a removed member receives their own removal once).',
      async filter(
        this: ConversationGovernanceResolverSubscription,
        payload,
        _variables,
        context
      ) {
        const actorID = context.req?.user?.actorID;
        const deliver = isGovernanceEventForActor(payload, actorID);
        this.logger.verbose?.(
          `[Conversation Governance] Filtering event ${payload.eventID} for user ${actorID}: member=${deliver}`,
          LogContext.SUBSCRIPTIONS
        );
        return deliver;
      },
      resolve(payload): ConversationGovernanceEvent {
        return toConversationGovernanceEvent(payload);
      },
    }
  )
  public async conversationGovernanceEvents(
    @CurrentActor() actorContext: ActorContext
  ) {
    if (!actorContext.actorID) {
      throw new ForbiddenException(
        'User could not be resolved',
        LogContext.COMMUNICATION_CONVERSATION,
        { actorContext }
      );
    }

    this.logger.verbose?.(
      `[Conversation Governance] User ${actorContext.actorID} subscribed to conversation governance events`,
      LogContext.SUBSCRIPTIONS
    );

    return this.subscriptionService.subscribeToConversationGovernanceEvents();
  }
}
