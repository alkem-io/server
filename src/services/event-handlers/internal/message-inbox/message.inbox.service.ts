import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { MutationType } from '@common/enums/subscriptions';
import { RoomType } from '@common/enums/room.type';
import { MessageReceivedEvent } from './message.received.event';
import { ReactionAddedEvent } from './reaction.added.event';
import { ReactionRemovedEvent } from './reaction.removed.event';
import { MessageEditedEvent } from './message.edited.event';
import { MessageRedactedEvent } from './message.redacted.event';
import { RoomCreatedEvent } from './room.created.event';
import { RoomDmRequestedEvent } from './room.dm.requested.event';
import { RoomMemberLeftEvent } from './room.member.left.event';
import { RoomMemberUpdatedEvent } from './room.member.updated.event';
import { RoomReceiptUpdatedEvent } from './room.receipt.updated.event';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { RoomLookupService } from '@domain/communication/room-lookup/room.lookup.service';
import { AgentInfoService } from '@core/authentication.agent.info/agent.info.service';
import { RoomServiceEvents } from '@domain/communication/room/room.service.events';
import { InAppNotificationService } from '@platform/in-app-notification/in.app.notification.service';
import { MessageNotificationService } from './message.notification.service';
import { VcInvocationService } from './vc.invocation.service';
import { IMessage } from '@domain/communication/message/message.interface';

/**
 * Event handler service for Matrix events.
 *
 * Thin orchestrator that:
 * - Handles all @OnEvent decorators
 * - Manages message counts and subscriptions
 * - Delegates notifications to MessageNotificationService
 * - Delegates VC invocation to VcInvocationService
 */
@Injectable()
export class MessageInboxService {
  constructor(
    private readonly roomLookupService: RoomLookupService,
    private readonly subscriptionPublishService: SubscriptionPublishService,
    private readonly agentInfoService: AgentInfoService,
    private readonly roomServiceEvents: RoomServiceEvents,
    private readonly inAppNotificationService: InAppNotificationService,
    private readonly messageNotificationService: MessageNotificationService,
    private readonly vcInvocationService: VcInvocationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  // ============================================================
  // MESSAGE EVENTS
  // ============================================================

  @OnEvent('message.received')
  async handleMessageReceived(event: MessageReceivedEvent): Promise<void> {
    const { payload } = event;

    this.logger.verbose?.(
      `Processing incoming message: roomId=${payload.roomId}, messageId=${payload.message.id}, actorID=${payload.actorID}`,
      LogContext.COMMUNICATION
    );

    const room = await this.roomLookupService.getRoomOrFail(payload.roomId);

    // Update message count
    room.messagesCount = (room.messagesCount ?? 0) + 1;
    await this.roomLookupService.save(room);

    // Build message object
    const message: IMessage = {
      id: payload.message.id,
      message: payload.message.message,
      sender: payload.actorID,
      threadID: payload.message.threadID || '',
      timestamp: payload.message.timestamp,
      reactions: [],
    };

    // Publish subscription
    this.subscriptionPublishService.publishRoomEvent(
      room,
      MutationType.CREATE,
      message
    );

    // Process notifications (skip for conversation rooms)
    if (
      room.type !== RoomType.CONVERSATION &&
      room.type !== RoomType.CONVERSATION_DIRECT
    ) {
      const agentInfo = await this.agentInfoService.buildAgentInfoForAgent(
        payload.actorID
      );

      await this.messageNotificationService.processMessageNotifications(
        room,
        message,
        agentInfo,
        payload.message.threadID
      );
    }

    // Process VC invocation
    await this.processVcInvocation(payload, room);
  }

  /**
   * Delegate VC invocation based on room type and thread state.
   */
  private async processVcInvocation(
    payload: MessageReceivedEvent['payload'],
    room: any
  ): Promise<void> {
    // Direct conversations have special handling
    if (room.type === RoomType.CONVERSATION_DIRECT) {
      await this.vcInvocationService.processDirectConversation(payload, room);
      return;
    }

    // Determine threadID: use existing or message ID as new thread root
    const threadID = payload.message.threadID || payload.message.id;

    // Check if this thread has an existing VC interaction
    const vcData = room.vcInteractionsByThread?.[threadID];

    if (vcData) {
      await this.vcInvocationService.processExistingThread(
        payload,
        room,
        threadID,
        vcData
      );
    } else {
      await this.vcInvocationService.processNewThread(payload, room, threadID);
    }
  }

  @OnEvent('message.edited')
  async handleMessageEdited(event: MessageEditedEvent): Promise<void> {
    const { payload } = event;

    this.logger.verbose?.(
      `Processing message edited: roomId=${payload.roomId}, originalMessageId=${payload.originalMessageId}`,
      LogContext.COMMUNICATION
    );

    // Fetch original message to preserve reactions and timestamp
    const { message: originalMessage, room } =
      await this.roomLookupService.getMessageInRoom(
        payload.roomId,
        payload.originalMessageId
      );

    if (!originalMessage) {
      this.logger.warn(
        `Cannot publish edit event: original message not found (roomId=${payload.roomId}, messageId=${payload.originalMessageId})`,
        LogContext.COMMUNICATION
      );
      return;
    }

    this.subscriptionPublishService.publishRoomEvent(
      room,
      MutationType.UPDATE,
      {
        id: payload.originalMessageId,
        message: payload.newContent,
        sender: payload.senderActorId,
        threadID: payload.threadId || '',
        timestamp: originalMessage.timestamp,
        reactions: originalMessage.reactions ?? [],
      }
    );
  }

  @OnEvent('message.redacted')
  async handleMessageRedacted(event: MessageRedactedEvent): Promise<void> {
    const { payload } = event;

    this.logger.verbose?.(
      `Processing message redacted: roomId=${payload.roomId}, redactedMessageId=${payload.redactedMessageId}`,
      LogContext.COMMUNICATION
    );

    const room = await this.roomLookupService.getRoomOrFail(payload.roomId);

    // Update message count
    if (room.messagesCount > 0) {
      room.messagesCount = room.messagesCount - 1;
      await this.roomLookupService.save(room);
    }

    // Delete in-app notifications
    await this.inAppNotificationService.deleteAllByMessageId(
      payload.redactedMessageId
    );

    // Process activity event
    const agentInfo = await this.agentInfoService.buildAgentInfoForAgent(
      payload.redactorActorId
    );
    await this.roomServiceEvents.processActivityMessageRemoved(
      payload.redactedMessageId,
      agentInfo
    );

    // Publish subscription
    this.subscriptionPublishService.publishRoomEvent(
      room,
      MutationType.DELETE,
      {
        id: payload.redactedMessageId,
        message: '',
        sender: '',
        timestamp: 0,
        reactions: [],
      }
    );
  }

  // ============================================================
  // REACTION EVENTS
  // ============================================================

  @OnEvent('reaction.added')
  async handleReactionAdded(event: ReactionAddedEvent): Promise<void> {
    const { payload } = event;

    this.logger.verbose?.(
      `Processing reaction added: roomId=${payload.roomId}, messageId=${payload.messageId}, reactionId=${payload.reactionId}`,
      LogContext.COMMUNICATION
    );

    const room = await this.roomLookupService.getRoomOrFail(payload.roomId);

    this.subscriptionPublishService.publishRoomEvent(
      room,
      MutationType.CREATE,
      {
        id: payload.reactionId,
        emoji: payload.emoji,
        sender: payload.actorID,
        timestamp: payload.timestamp,
      },
      payload.messageId
    );
  }

  @OnEvent('reaction.removed')
  async handleReactionRemoved(event: ReactionRemovedEvent): Promise<void> {
    const { payload } = event;

    this.logger.verbose?.(
      `Processing reaction removed: roomId=${payload.roomId}, messageId=${payload.messageId}, reactionId=${payload.reactionId}`,
      LogContext.COMMUNICATION
    );

    const room = await this.roomLookupService.getRoomOrFail(payload.roomId);

    this.subscriptionPublishService.publishRoomEvent(
      room,
      MutationType.DELETE,
      {
        id: payload.reactionId,
        emoji: '',
        sender: '',
        timestamp: payload.timestamp,
      },
      payload.messageId
    );
  }

  // ============================================================
  // ROOM EVENTS
  // ============================================================

  @OnEvent('room.created')
  async handleRoomCreated(event: RoomCreatedEvent): Promise<void> {
    const { payload } = event;

    this.logger.verbose?.(
      `Processing room created: roomId=${payload.roomId}, roomType=${payload.roomType}, creator=${payload.creatorActorId}`,
      LogContext.COMMUNICATION
    );

    // Currently logging only - Alkemio initiates room creation
  }

  @OnEvent('room.dm.requested')
  async handleRoomDmRequested(event: RoomDmRequestedEvent): Promise<void> {
    const { payload } = event;

    this.logger.verbose?.(
      `Processing DM requested: initiator=${payload.initiatorActorId}, target=${payload.targetActorId}`,
      LogContext.COMMUNICATION
    );

    // TODO: Consider auto-creating Alkemio conversation when DM is requested from Matrix
  }

  @OnEvent('room.member.left')
  async handleRoomMemberLeft(event: RoomMemberLeftEvent): Promise<void> {
    const { payload } = event;

    this.logger.verbose?.(
      `Processing room member left: roomId=${payload.roomId}, actorId=${payload.actorId}, reason=${payload.reason || 'none'}`,
      LogContext.COMMUNICATION
    );

    // TODO: Consider syncing membership changes back to Alkemio
  }

  @OnEvent('room.member.updated')
  async handleRoomMemberUpdated(event: RoomMemberUpdatedEvent): Promise<void> {
    const { payload } = event;

    this.logger.verbose?.(
      `Processing room member updated: roomId=${payload.roomId}, memberActorId=${payload.memberActorId}, membership=${payload.membership}`,
      LogContext.COMMUNICATION
    );

    // TODO: Consider syncing membership changes back to Alkemio
  }

  @OnEvent('room.receipt.updated')
  async handleRoomReceiptUpdated(
    event: RoomReceiptUpdatedEvent
  ): Promise<void> {
    const { payload } = event;

    this.logger.verbose?.(
      `Processing read receipt updated: roomId=${payload.roomId}, actorId=${payload.actorId}, eventId=${payload.eventId}`,
      LogContext.COMMUNICATION
    );

    const room = await this.roomLookupService.getRoomOrFail(payload.roomId);

    this.subscriptionPublishService.publishRoomReceiptEvent(room, {
      actorId: payload.actorId,
      eventId: payload.eventId,
      threadId: payload.threadId,
      timestamp: payload.timestamp,
    });
  }
}
