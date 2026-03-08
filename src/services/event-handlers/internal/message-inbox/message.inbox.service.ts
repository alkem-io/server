import { LogContext } from '@common/enums';
import { RoomType } from '@common/enums/room.type';
import { MutationType } from '@common/enums/subscriptions';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { ActorService } from '@domain/actor/actor/actor.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ConversationService } from '@domain/communication/conversation/conversation.service';
import { ConversationAuthorizationService } from '@domain/communication/conversation/conversation.service.authorization';
import { IMessage } from '@domain/communication/message/message.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { RoomServiceEvents } from '@domain/communication/room/room.service.events';
import { RoomLookupService } from '@domain/communication/room-lookup/room.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InAppNotificationService } from '@platform/in-app-notification/in.app.notification.service';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { randomUUID } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MessageEditedEvent } from './message.edited.event';
import { MessageNotificationService } from './message.notification.service';
import { MessageReceivedEvent } from './message.received.event';
import { MessageRedactedEvent } from './message.redacted.event';
import { ReactionAddedEvent } from './reaction.added.event';
import { ReactionRemovedEvent } from './reaction.removed.event';
import { RoomCreatedEvent } from './room.created.event';
import { RoomDmRequestedEvent } from './room.dm.requested.event';
import { RoomMemberUpdatedEvent } from './room.member.updated.event';
import { RoomReceiptUpdatedEvent } from './room.receipt.updated.event';
import { RoomUpdatedEvent } from './room.updated.event';
import { VcInvocationService } from './vc.invocation.service';

/**
 * Check if a room is a conversation room (direct messaging).
 */
function isConversationRoom(room: IRoom): boolean {
  return (
    room.type === RoomType.CONVERSATION ||
    room.type === RoomType.CONVERSATION_DIRECT ||
    room.type === RoomType.CONVERSATION_GROUP
  );
}

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
    private readonly actorContextService: ActorContextService,
    private readonly roomServiceEvents: RoomServiceEvents,
    private readonly inAppNotificationService: InAppNotificationService,
    private readonly messageNotificationService: MessageNotificationService,
    private readonly vcInvocationService: VcInvocationService,
    private readonly conversationService: ConversationService,
    private readonly conversationAuthorizationService: ConversationAuthorizationService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly actorService: ActorService,
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
    if (isConversationRoom(room)) {
      await this.publishMessageReceivedConversationEvent(room, message);
    }

    // Process notifications (skip for conversation rooms)
    if (!isConversationRoom(room)) {
      const actorContext = await this.actorContextService.buildForActor(
        payload.actorID
      );

      await this.messageNotificationService.processMessageNotifications(
        room,
        message,
        actorContext,
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
    // Conversation rooms use direct VC invocation
    // This handles USER_VC conversations where the VC should respond to every message
    if (isConversationRoom(room)) {
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
        sender: payload.senderActorID,
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
    const actorContext = await this.actorContextService.buildForActor(
      payload.redactorActorID
    );
    await this.roomServiceEvents.processActivityMessageRemoved(
      payload.redactedMessageId,
      actorContext
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
    if (isConversationRoom(room)) {
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
      `Processing room created: roomId=${payload.roomId}, roomType=${payload.roomType}, creator=${payload.creatorActorID}`,
      LogContext.COMMUNICATION
    );

    // Currently logging only - Alkemio initiates room creation
  }

  @OnEvent('room.dm.requested')
  async handleRoomDmRequested(event: RoomDmRequestedEvent): Promise<void> {
    const { payload } = event;

    this.logger.verbose?.(
      `Processing DM requested: initiator=${payload.initiatorActorID}, target=${payload.targetActorID}`,
      LogContext.COMMUNICATION
    );

    // TODO: Consider auto-creating Alkemio conversation when DM is requested from Matrix
  }

  @OnEvent('room.member.updated')
  async handleRoomMemberUpdated(event: RoomMemberUpdatedEvent): Promise<void> {
    const { payload } = event;

    this.logger.verbose?.(
      `Processing room member updated: roomId=${payload.roomId}, memberActorID=${payload.memberActorID}, membership=${payload.membership}`,
      LogContext.COMMUNICATION
    );

    const room = await this.roomLookupService.getRoomOrFail(payload.roomId);

    // Only process membership changes for conversation rooms
    if (!isConversationRoom(room)) {
      return;
    }

    const conversation =
      await this.conversationService.findConversationByRoomId(room.id);

    if (!conversation) {
      this.logger.warn(
        `Could not find conversation for room ${room.id} - skipping membership event`,
        LogContext.COMMUNICATION
      );
      return;
    }

    // Only process membership changes for GROUP conversations.
    // DIRECT rooms have a fixed 2-member invariant — Matrix should never
    // send join/leave for them, but guard defensively.
    if (room.type !== RoomType.CONVERSATION_GROUP) {
      this.logger.verbose?.(
        `Ignoring membership event for non-group conversation room ${room.id} (type=${room.type})`,
        LogContext.COMMUNICATION
      );
      return;
    }

    if (payload.membership === 'join') {
      await this.handleConversationMemberJoined(
        conversation.id,
        payload.memberActorID
      );
    } else if (payload.membership === 'leave') {
      await this.handleConversationMemberLeft(
        conversation.id,
        payload.memberActorID
      );
    }
  }

  /**
   * Handle a member joining a conversation room.
   * Persists membership → re-applies auth policy → publishes MEMBER_ADDED event.
   */
  private async handleConversationMemberJoined(
    conversationId: string,
    memberActorId: string
  ): Promise<void> {
    // Persist membership (idempotent)
    await this.conversationService.persistMemberAdded(
      conversationId,
      memberActorId
    );

    // Re-apply authorization policy
    const authorizations =
      await this.conversationAuthorizationService.applyAuthorizationPolicy(
        conversationId
      );
    await this.authorizationPolicyService.saveAll(authorizations);

    // Resolve the added member actor for the event
    const addedActor = await this.actorService.getActorOrFail(memberActorId);

    // Reload conversation for subscription payload
    const conversation =
      await this.conversationService.getConversationOrFail(conversationId);

    // Publish MEMBER_ADDED to all members (including the new one)
    const memberActorIds =
      await this.conversationService.getConversationMemberActorIds(
        conversationId
      );

    await this.subscriptionPublishService.publishConversationEvent({
      eventID: `conversation-event-${randomUUID()}`,
      memberActorIds,
      memberAdded: {
        conversation,
        addedMember: addedActor,
      },
    });

    this.logger.verbose?.(
      `Published MEMBER_ADDED event for conversation ${conversationId}, member ${memberActorId}`,
      LogContext.COMMUNICATION
    );
  }

  /**
   * Handle a member leaving a conversation room.
   * Collects members before removal → persists removal → publishes MEMBER_REMOVED →
   * if 0 remaining: publishes CONVERSATION_DELETED + deletes conversation,
   * else: re-applies auth policy.
   */
  private async handleConversationMemberLeft(
    conversationId: string,
    memberActorId: string
  ): Promise<void> {
    // Collect member IDs before removal (so removed member also receives the event)
    const memberActorIdsBefore =
      await this.conversationService.getConversationMemberActorIds(
        conversationId
      );

    // Persist membership removal, get remaining count
    const remainingCount = await this.conversationService.persistMemberRemoved(
      conversationId,
      memberActorId
    );

    // Load conversation for event payload
    const conversation =
      await this.conversationService.getConversationOrFail(conversationId);

    if (remainingCount === 0) {
      // Publish MEMBER_REMOVED before deleting
      await this.subscriptionPublishService.publishConversationEvent({
        eventID: `conversation-event-${randomUUID()}`,
        memberActorIds: memberActorIdsBefore,
        memberRemoved: {
          conversation,
          removedMemberID: memberActorId,
        },
      });

      // Delete first, then notify — so clients never see a deletion that didn't commit
      await this.conversationService.deleteConversation(conversationId);

      await this.subscriptionPublishService.publishConversationEvent({
        eventID: `conversation-event-${randomUUID()}`,
        memberActorIds: memberActorIdsBefore,
        conversationDeleted: {
          conversationID: conversationId,
        },
      });

      this.logger.verbose?.(
        `Auto-deleted empty conversation ${conversationId}, published MEMBER_REMOVED + CONVERSATION_DELETED`,
        LogContext.COMMUNICATION
      );
    } else {
      // Re-apply authorization policy BEFORE publishing event
      const authorizations =
        await this.conversationAuthorizationService.applyAuthorizationPolicy(
          conversationId
        );
      await this.authorizationPolicyService.saveAll(authorizations);

      // Publish MEMBER_REMOVED after auth is updated
      await this.subscriptionPublishService.publishConversationEvent({
        eventID: `conversation-event-${randomUUID()}`,
        memberActorIds: memberActorIdsBefore,
        memberRemoved: {
          conversation,
          removedMemberID: memberActorId,
        },
      });

      this.logger.verbose?.(
        `Published MEMBER_REMOVED event for conversation ${conversationId}, member ${memberActorId}, remaining=${remainingCount}`,
        LogContext.COMMUNICATION
      );
    }
  }

  @OnEvent('room.receipt.updated')
  async handleRoomReceiptUpdated(
    event: RoomReceiptUpdatedEvent
  ): Promise<void> {
    const { payload } = event;

    this.logger.verbose?.(
      `Processing read receipt updated: roomId=${payload.roomId}, actorID=${payload.actorID}, eventId=${payload.eventId}`,
      LogContext.COMMUNICATION
    );

    const room = await this.roomLookupService.getRoomOrFail(payload.roomId);

    this.subscriptionPublishService.publishRoomReceiptEvent(room, {
      actorID: payload.actorID,
      eventId: payload.eventId,
      threadId: payload.threadId,
      timestamp: payload.timestamp,
    });

    // Publish conversation events for direct messaging rooms
    if (isConversationRoom(room)) {
      await this.publishReadReceiptConversationEvent(room, payload);
    }
  }

  @OnEvent('room.updated')
  async handleRoomUpdated(event: RoomUpdatedEvent): Promise<void> {
    const { payload } = event;

    this.logger.verbose?.(
      `Processing room updated: roomId=${payload.roomId}, displayName=${payload.displayName}, avatarUrl=${payload.avatarUrl}`,
      LogContext.COMMUNICATION
    );

    const room = await this.roomLookupService.getRoomOrFail(payload.roomId);
    let changed = false;

    if (
      payload.displayName !== undefined &&
      room.displayName !== payload.displayName
    ) {
      room.displayName = payload.displayName;
      changed = true;
    }

    if (
      payload.avatarUrl !== undefined &&
      room.avatarUrl !== payload.avatarUrl
    ) {
      room.avatarUrl = payload.avatarUrl;
      changed = true;
    }

    if (changed) {
      await this.roomLookupService.save(room);

      if (isConversationRoom(room)) {
        await this.publishConversationUpdatedEvent(room);
      }
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

    const memberActorIds =
      await this.conversationService.getConversationMemberActorIds(
        conversation.id
      );

    this.subscriptionPublishService.publishConversationEvent({
      eventID: `conversation-event-${randomUUID()}`,
      memberActorIds,
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

    const memberActorIds =
      await this.conversationService.getConversationMemberActorIds(
        conversation.id
      );

    this.subscriptionPublishService.publishConversationEvent({
      eventID: `conversation-event-${randomUUID()}`,
      memberActorIds,
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
      memberActorIds: [payload.actorID], // Only the reader receives this event
      readReceiptUpdated: {
        roomId: room.id,
        lastReadMessageId: payload.eventId,
      },
    });
  }

  private async publishConversationUpdatedEvent(room: IRoom): Promise<void> {
    const conversation =
      await this.conversationService.findConversationByRoomId(room.id);

    if (!conversation) {
      this.logger.warn(
        `Could not find conversation for room ${room.id} - skipping updated event`,
        LogContext.COMMUNICATION
      );
      return;
    }

    const memberActorIds =
      await this.conversationService.getConversationMemberActorIds(
        conversation.id
      );

    this.subscriptionPublishService.publishConversationEvent({
      eventID: `conversation-event-${randomUUID()}`,
      memberActorIds,
      conversationUpdated: {
        conversation,
      },
    });
  }
}
