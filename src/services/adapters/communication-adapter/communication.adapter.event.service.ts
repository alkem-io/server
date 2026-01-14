import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import {
  MatrixAdapterEventType,
  MessageReceivedPayload,
  ReactionAddedEvent as MatrixReactionAddedEvent,
  ReactionRemovedEvent as MatrixReactionRemovedEvent,
  MessageEditedEvent as MatrixMessageEditedEvent,
  MessageRedactedEvent as MatrixMessageRedactedEvent,
  RoomCreatedEvent as MatrixRoomCreatedEvent,
  DMRequestedEvent as MatrixDMRequestedEvent,
  RoomMemberLeftEvent as MatrixRoomMemberLeftEvent,
  RoomMemberUpdatedEvent as MatrixRoomMemberUpdatedEvent,
  ReadReceiptUpdatedEvent as MatrixReadReceiptUpdatedEvent,
} from '@alkemio/matrix-adapter-lib';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';
import { MessageReceivedEvent } from '@services/event-handlers/internal/message-inbox/message.received.event';
import { ReactionAddedEvent } from '@services/event-handlers/internal/message-inbox/reaction.added.event';
import { ReactionRemovedEvent } from '@services/event-handlers/internal/message-inbox/reaction.removed.event';
import { MessageEditedEvent } from '@services/event-handlers/internal/message-inbox/message.edited.event';
import { MessageRedactedEvent } from '@services/event-handlers/internal/message-inbox/message.redacted.event';
import { RoomCreatedEvent } from '@services/event-handlers/internal/message-inbox/room.created.event';
import { RoomDmRequestedEvent } from '@services/event-handlers/internal/message-inbox/room.dm.requested.event';
import { RoomMemberLeftEvent } from '@services/event-handlers/internal/message-inbox/room.member.left.event';
import { RoomMemberUpdatedEvent } from '@services/event-handlers/internal/message-inbox/room.member.updated.event';
import { RoomReceiptUpdatedEvent } from '@services/event-handlers/internal/message-inbox/room.receipt.updated.event';

/**
 * Boundary service for Matrix Adapter RabbitMQ events.
 *
 * Uses @golevelup/nestjs-rabbitmq decorators which are compatible with the
 * Go Matrix Adapter's Watermill-based event publishing.
 *
 * Responsibilities:
 * - Receive external RabbitMQ events from Matrix Adapter (Go)
 * - Publish internal domain events to MessageInboxService
 * - Handle message acknowledgment/rejection
 *
 * Does NOT contain business logic - pure translation layer.
 */
@Injectable()
export class CommunicationAdapterEventService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Receives messages from Matrix Adapter via RabbitMQ.
   *
   * Publishes internal 'message.received' event for domain processing.
   *
   * @param payload - Message details from Matrix Adapter
   */
  @RabbitSubscribe({
    exchange: '',
    routingKey: '',
    queue: MatrixAdapterEventType.COMMUNICATION_MESSAGE_RECEIVED,
    createQueueIfNotExists: true,
    queueOptions: {
      durable: true,
    },
  })
  async onMessageReceived(
    payload: MessageReceivedPayload
  ): Promise<void | Nack> {
    try {
      this.logger.verbose?.(
        `Received RabbitMQ event: roomId=${payload.roomId}, messageId=${payload.message.id}, actorID=${payload.actorID}`,
        LogContext.COMMUNICATION
      );

      // Publish internal domain event (fire and forget)
      this.eventEmitter.emit(
        'message.received',
        new MessageReceivedEvent(payload)
      );

      // Return void for successful ack
    } catch (error) {
      this.logger.error(
        `Error handling RabbitMQ message: ${error}`,
        error instanceof Error ? error.stack : undefined,
        LogContext.COMMUNICATION
      );

      // Return Nack to reject and requeue
      return new Nack(true);
    }
  }

  /**
   * Receives reaction added events from Matrix Adapter via RabbitMQ.
   *
   * Publishes internal 'reaction.added' event for domain processing.
   */
  @RabbitSubscribe({
    exchange: '',
    routingKey: '',
    queue: MatrixAdapterEventType.COMMUNICATION_REACTION_ADDED,
    createQueueIfNotExists: true,
    queueOptions: {
      durable: true,
    },
  })
  async onReactionAdded(
    payload: MatrixReactionAddedEvent
  ): Promise<void | Nack> {
    try {
      this.logger.verbose?.(
        `Received reaction added event: roomId=${payload.alkemio_room_id}, messageId=${payload.message_id}, reactionId=${payload.reaction_id}`,
        LogContext.COMMUNICATION
      );

      this.eventEmitter.emit(
        'reaction.added',
        new ReactionAddedEvent({
          roomId: payload.alkemio_room_id,
          messageId: payload.message_id,
          reactionId: payload.reaction_id,
          emoji: payload.emoji,
          actorID: payload.sender_actor_id,
          timestamp: payload.timestamp,
        })
      );
    } catch (error) {
      this.logger.error(
        `Error handling reaction added event: ${error}`,
        error instanceof Error ? error.stack : undefined,
        LogContext.COMMUNICATION
      );
      return new Nack(true);
    }
  }

  /**
   * Receives reaction removed events from Matrix Adapter via RabbitMQ.
   *
   * Publishes internal 'reaction.removed' event for domain processing.
   */
  @RabbitSubscribe({
    exchange: '',
    routingKey: '',
    queue: MatrixAdapterEventType.COMMUNICATION_REACTION_REMOVED,
    createQueueIfNotExists: true,
    queueOptions: {
      durable: true,
    },
  })
  async onReactionRemoved(
    payload: MatrixReactionRemovedEvent
  ): Promise<void | Nack> {
    try {
      this.logger.verbose?.(
        `Received reaction removed event: roomId=${payload.alkemio_room_id}, messageId=${payload.message_id}, reactionId=${payload.reaction_id}`,
        LogContext.COMMUNICATION
      );

      this.eventEmitter.emit(
        'reaction.removed',
        new ReactionRemovedEvent({
          roomId: payload.alkemio_room_id,
          messageId: payload.message_id,
          reactionId: payload.reaction_id,
          timestamp: payload.timestamp,
        })
      );
    } catch (error) {
      this.logger.error(
        `Error handling reaction removed event: ${error}`,
        error instanceof Error ? error.stack : undefined,
        LogContext.COMMUNICATION
      );
      return new Nack(true);
    }
  }

  /**
   * Receives message edited events from Matrix Adapter via RabbitMQ.
   *
   * Publishes internal 'message.edited' event for domain processing.
   */
  @RabbitSubscribe({
    exchange: '',
    routingKey: '',
    queue: MatrixAdapterEventType.COMMUNICATION_MESSAGE_EDITED,
    createQueueIfNotExists: true,
    queueOptions: {
      durable: true,
    },
  })
  async onMessageEdited(
    payload: MatrixMessageEditedEvent
  ): Promise<void | Nack> {
    try {
      this.logger.verbose?.(
        `Received message edited event: roomId=${payload.alkemio_room_id}, originalMessageId=${payload.original_message_id}, newMessageId=${payload.new_message_id}`,
        LogContext.COMMUNICATION
      );

      this.eventEmitter.emit(
        'message.edited',
        new MessageEditedEvent({
          roomId: payload.alkemio_room_id,
          senderActorId: payload.sender_actor_id,
          originalMessageId: payload.original_message_id,
          newMessageId: payload.new_message_id,
          newContent: payload.new_content,
          threadId: payload.thread_id,
          timestamp: payload.timestamp,
        })
      );
    } catch (error) {
      this.logger.error(
        `Error handling message edited event: ${error}`,
        error instanceof Error ? error.stack : undefined,
        LogContext.COMMUNICATION
      );
      return new Nack(true);
    }
  }

  /**
   * Receives message redacted (deleted) events from Matrix Adapter via RabbitMQ.
   *
   * Publishes internal 'message.redacted' event for domain processing.
   */
  @RabbitSubscribe({
    exchange: '',
    routingKey: '',
    queue: MatrixAdapterEventType.COMMUNICATION_MESSAGE_REDACTED,
    createQueueIfNotExists: true,
    queueOptions: {
      durable: true,
    },
  })
  async onMessageRedacted(
    payload: MatrixMessageRedactedEvent
  ): Promise<void | Nack> {
    try {
      this.logger.verbose?.(
        `Received message redacted event: roomId=${payload.alkemio_room_id}, redactedMessageId=${payload.redacted_message_id}`,
        LogContext.COMMUNICATION
      );

      this.eventEmitter.emit(
        'message.redacted',
        new MessageRedactedEvent({
          roomId: payload.alkemio_room_id,
          redactorActorId: payload.redactor_actor_id,
          redactedMessageId: payload.redacted_message_id,
          redactionMessageId: payload.redaction_message_id,
          reason: payload.reason,
          threadId: payload.thread_id,
          timestamp: payload.timestamp,
        })
      );
    } catch (error) {
      this.logger.error(
        `Error handling message redacted event: ${error}`,
        error instanceof Error ? error.stack : undefined,
        LogContext.COMMUNICATION
      );
      return new Nack(true);
    }
  }

  /**
   * Receives room created events from Matrix Adapter via RabbitMQ.
   *
   * Publishes internal 'room.created' event for domain processing.
   */
  @RabbitSubscribe({
    exchange: '',
    routingKey: '',
    queue: MatrixAdapterEventType.COMMUNICATION_ROOM_CREATED,
    createQueueIfNotExists: true,
    queueOptions: {
      durable: true,
    },
  })
  async onRoomCreated(payload: MatrixRoomCreatedEvent): Promise<void | Nack> {
    try {
      this.logger.verbose?.(
        `Received room created event: roomId=${payload.alkemio_room_id}, roomType=${payload.room_type}`,
        LogContext.COMMUNICATION
      );

      this.eventEmitter.emit(
        'room.created',
        new RoomCreatedEvent({
          roomId: payload.alkemio_room_id,
          creatorActorId: payload.creator_actor_id,
          roomType: payload.room_type,
          name: payload.name,
          topic: payload.topic,
          timestamp: payload.timestamp,
        })
      );
    } catch (error) {
      this.logger.error(
        `Error handling room created event: ${error}`,
        error instanceof Error ? error.stack : undefined,
        LogContext.COMMUNICATION
      );
      return new Nack(true);
    }
  }

  /**
   * Receives DM requested events from Matrix Adapter via RabbitMQ.
   *
   * Publishes internal 'room.dm.requested' event for domain processing.
   */
  @RabbitSubscribe({
    exchange: '',
    routingKey: '',
    queue: MatrixAdapterEventType.COMMUNICATION_ROOM_DM_REQUESTED,
    createQueueIfNotExists: true,
    queueOptions: {
      durable: true,
    },
  })
  async onRoomDmRequested(
    payload: MatrixDMRequestedEvent
  ): Promise<void | Nack> {
    try {
      this.logger.verbose?.(
        `Received DM requested event: initiator=${payload.initiator_actor_id}, target=${payload.target_actor_id}`,
        LogContext.COMMUNICATION
      );

      this.eventEmitter.emit(
        'room.dm.requested',
        new RoomDmRequestedEvent({
          initiatorActorId: payload.initiator_actor_id,
          targetActorId: payload.target_actor_id,
          timestamp: payload.timestamp,
        })
      );
    } catch (error) {
      this.logger.error(
        `Error handling DM requested event: ${error}`,
        error instanceof Error ? error.stack : undefined,
        LogContext.COMMUNICATION
      );
      return new Nack(true);
    }
  }

  /**
   * Receives room member left events from Matrix Adapter via RabbitMQ.
   *
   * Publishes internal 'room.member.left' event for domain processing.
   */
  @RabbitSubscribe({
    exchange: '',
    routingKey: '',
    queue: MatrixAdapterEventType.COMMUNICATION_ROOM_MEMBER_LEFT,
    createQueueIfNotExists: true,
    queueOptions: {
      durable: true,
    },
  })
  async onRoomMemberLeft(
    payload: MatrixRoomMemberLeftEvent
  ): Promise<void | Nack> {
    try {
      this.logger.verbose?.(
        `Received room member left event: roomId=${payload.alkemio_room_id}, actorId=${payload.actor_id}`,
        LogContext.COMMUNICATION
      );

      this.eventEmitter.emit(
        'room.member.left',
        new RoomMemberLeftEvent({
          roomId: payload.alkemio_room_id,
          actorId: payload.actor_id,
          reason: payload.reason,
          timestamp: payload.timestamp,
        })
      );
    } catch (error) {
      this.logger.error(
        `Error handling room member left event: ${error}`,
        error instanceof Error ? error.stack : undefined,
        LogContext.COMMUNICATION
      );
      return new Nack(true);
    }
  }

  /**
   * Receives room member updated events from Matrix Adapter via RabbitMQ.
   *
   * Publishes internal 'room.member.updated' event for domain processing.
   */
  @RabbitSubscribe({
    exchange: '',
    routingKey: '',
    queue: MatrixAdapterEventType.COMMUNICATION_ROOM_MEMBER_UPDATED,
    createQueueIfNotExists: true,
    queueOptions: {
      durable: true,
    },
  })
  async onRoomMemberUpdated(
    payload: MatrixRoomMemberUpdatedEvent
  ): Promise<void | Nack> {
    try {
      this.logger.verbose?.(
        `Received room member updated event: roomId=${payload.alkemio_room_id}, memberActorId=${payload.member_actor_id}, membership=${payload.membership}`,
        LogContext.COMMUNICATION
      );

      this.eventEmitter.emit(
        'room.member.updated',
        new RoomMemberUpdatedEvent({
          roomId: payload.alkemio_room_id,
          memberActorId: payload.member_actor_id,
          senderActorId: payload.sender_actor_id,
          membership: payload.membership,
          timestamp: payload.timestamp,
        })
      );
    } catch (error) {
      this.logger.error(
        `Error handling room member updated event: ${error}`,
        error instanceof Error ? error.stack : undefined,
        LogContext.COMMUNICATION
      );
      return new Nack(true);
    }
  }

  /**
   * Receives read receipt updated events from Matrix Adapter via RabbitMQ.
   *
   * Publishes internal 'room.receipt.updated' event for domain processing.
   */
  @RabbitSubscribe({
    exchange: '',
    routingKey: '',
    queue: MatrixAdapterEventType.COMMUNICATION_ROOM_RECEIPT_UPDATED,
    createQueueIfNotExists: true,
    queueOptions: {
      durable: true,
    },
  })
  async onRoomReceiptUpdated(
    payload: MatrixReadReceiptUpdatedEvent
  ): Promise<void | Nack> {
    try {
      this.logger.verbose?.(
        `Received read receipt updated event: roomId=${payload.alkemio_room_id}, actorId=${payload.actor_id}, eventId=${payload.event_id}`,
        LogContext.COMMUNICATION
      );

      this.eventEmitter.emit(
        'room.receipt.updated',
        new RoomReceiptUpdatedEvent({
          roomId: payload.alkemio_room_id,
          actorId: payload.actor_id,
          eventId: payload.event_id,
          threadId: payload.thread_id,
          timestamp: payload.timestamp,
        })
      );
    } catch (error) {
      this.logger.error(
        `Error handling read receipt updated event: ${error}`,
        error instanceof Error ? error.stack : undefined,
        LogContext.COMMUNICATION
      );
      return new Nack(true);
    }
  }
}
