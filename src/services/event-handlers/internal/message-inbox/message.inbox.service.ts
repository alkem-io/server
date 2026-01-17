import { randomUUID } from 'crypto';
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
import { ConversationService } from '@domain/communication/conversation/conversation.service';
import { IRoom } from '@domain/communication/room/room.interface';

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
    private readonly conversationService: ConversationService,
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

    // Atomically increment message count to avoid race conditions
    await this.roomLookupService.incrementMessagesCount(room.id);

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

    // Publish conversation events for direct messaging rooms
    // Note: conversationCreated is fired when conversation is created, not on first message
    if (
      room.type === RoomType.CONVERSATION ||
      room.type === RoomType.CONVERSATION_DIRECT
    ) {
      await this.publishMessageReceivedConversationEvent(room, message);
    }

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
    room: IRoom
  ): Promise<void> {
    // Conversation rooms (both CONVERSATION and CONVERSATION_DIRECT) use direct VC invocation
    // This handles USER_VC conversations where the VC should respond to every message
    if (
      room.type === RoomType.CONVERSATION_DIRECT ||
      room.type === RoomType.CONVERSATION
    ) {
      await this.vcInvocationService.processDirectConversation(payload, room);
      return;
    }

    // For other room types (e.g., discussions), use thread-based VC tracking
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

    // Atomically decrement message count (safe: won't go below 0)
    await this.roomLookupService.decrementMessagesCount(room.id);

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

    // Publish room subscription
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

    // Publish conversation event for direct messaging rooms
    if (
      room.type === RoomType.CONVERSATION ||
      room.type === RoomType.CONVERSATION_DIRECT
    ) {
      await this.publishMessageRemovedConversationEvent(
        room,
        payload.redactedMessageId
      );
    }
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

    // Publish conversation events for direct messaging rooms
    if (
      room.type === RoomType.CONVERSATION ||
      room.type === RoomType.CONVERSATION_DIRECT
    ) {
      await this.publishReadReceiptConversationEvent(room, payload);
    }
  }

  // ============================================================
  // CONVERSATION EVENT HELPERS
  // ============================================================

  /**
   * Publish a message received conversation event.
   * Note: conversationCreated events are fired from MessagingService.createConversation().
   */
  private async publishMessageReceivedConversationEvent(
    room: IRoom,
    message: IMessage
  ): Promise<void> {
    const conversation =
      await this.conversationService.findConversationByRoomId(room.id);

    if (!conversation) {
      this.logger.warn(
        `Could not find conversation for room ${room.id} - skipping message received event`,
        LogContext.COMMUNICATION
      );
      return;
    }

    const memberAgentIds =
      await this.conversationService.getConversationMemberAgentIds(
        conversation.id
      );

    this.subscriptionPublishService.publishConversationEvent({
      eventID: `conversation-event-${randomUUID()}`,
      memberAgentIds,
      messageReceived: {
        roomId: room.id,
        message,
      },
    });
  }

  /**
   * Publish a message removed conversation event.
   * Notifies all conversation members that a message was deleted.
   */
  private async publishMessageRemovedConversationEvent(
    room: IRoom,
    messageId: string
  ): Promise<void> {
    const conversation =
      await this.conversationService.findConversationByRoomId(room.id);

    if (!conversation) {
      this.logger.warn(
        `Could not find conversation for room ${room.id} - skipping message removed event`,
        LogContext.COMMUNICATION
      );
      return;
    }

    const memberAgentIds =
      await this.conversationService.getConversationMemberAgentIds(
        conversation.id
      );

    this.subscriptionPublishService.publishConversationEvent({
      eventID: `conversation-event-${randomUUID()}`,
      memberAgentIds,
      messageRemoved: {
        roomId: room.id,
        messageId,
      },
    });
  }

  /**
   * Publish a read receipt conversation event.
   * Only sent to the reader to sync read position across their devices.
   */
  private async publishReadReceiptConversationEvent(
    room: IRoom,
    payload: RoomReceiptUpdatedEvent['payload']
  ): Promise<void> {
    this.subscriptionPublishService.publishConversationEvent({
      eventID: `conversation-event-${randomUUID()}`,
      memberAgentIds: [payload.actorId], // Only the reader receives this event
      readReceiptUpdated: {
        roomId: room.id,
        lastReadMessageId: payload.eventId,
      },
    });
  }
}
