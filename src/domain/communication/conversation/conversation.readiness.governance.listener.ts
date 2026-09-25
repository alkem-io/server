import { LogContext } from '@common/enums';
import {
  ROOM_READINESS_CHANGED_EVENT,
  RoomReadinessChangedEvent,
} from '@domain/communication/room/room.readiness.changed.event';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConversationService } from './conversation.service';
import { ConversationGovernanceEventType } from './dto/conversation.governance.event';

/**
 * Turns a readiness change on a conversation's room into one
 * ROOM_READINESS_CHANGED governance event for that conversation's members.
 *
 * Nothing is published for rooms that belong to no persisted conversation
 * (comments, updates, forum, calendar) and nothing during creation — the
 * memberships are not persisted yet at that moment and the created event
 * carries the creation-time readiness itself.
 */
@Injectable()
export class ConversationReadinessGovernanceListener {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly subscriptionPublishService: SubscriptionPublishService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @OnEvent(ROOM_READINESS_CHANGED_EVENT)
  async handleReadinessChanged(
    event: RoomReadinessChangedEvent
  ): Promise<void> {
    if (event.source === 'PROVISIONING') {
      // Creation-time write: travels inside the created event.
      return;
    }

    const conversation =
      await this.conversationService.findConversationByRoomId(event.room.id);
    if (!conversation) {
      return;
    }

    const memberActorIds =
      await this.conversationService.getConversationMemberActorIds(
        conversation.id
      );
    if (memberActorIds.length === 0) {
      return;
    }

    await this.subscriptionPublishService.publishConversationGovernanceEvent(
      memberActorIds,
      {
        eventType: ConversationGovernanceEventType.ROOM_READINESS_CHANGED,
        conversationID: conversation.id,
        conversation,
        readiness: event.current,
      }
    );

    this.logger.verbose?.(
      `Published ROOM_READINESS_CHANGED for conversation ${conversation.id}: ${event.current.state}/${event.current.reason}`,
      LogContext.COMMUNICATION_CONVERSATION
    );
  }
}
