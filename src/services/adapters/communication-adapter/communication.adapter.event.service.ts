import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import {
  MatrixAdapterEventType,
  MessageReceivedPayload,
  ReactionAddedEvent as MatrixReactionAddedEvent,
  ReactionRemovedEvent as MatrixReactionRemovedEvent,
} from '@alkemio/matrix-adapter-lib';
import { MessageReceivedEvent } from '@domain/communication/message-inbox/message.received.event';
import { ReactionAddedEvent } from '@domain/communication/message-inbox/reaction.added.event';
import { ReactionRemovedEvent } from '@domain/communication/message-inbox/reaction.removed.event';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';

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
    queue: MatrixAdapterEventType.COMMUNICATION_MESSAGE_RECEIVED,
    createQueueIfNotExists: true,
    queueOptions: {
      durable: true,
    },
  })
  async onMessageReceived(payload: MessageReceivedPayload): Promise<void> {
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
      return new Nack(true) as unknown as void;
    }
  }

  /**
   * Receives reaction added events from Matrix Adapter via RabbitMQ.
   *
   * Publishes internal 'reaction.added' event for domain processing.
   */
  @RabbitSubscribe({
    queue: MatrixAdapterEventType.COMMUNICATION_REACTION_ADDED,
    createQueueIfNotExists: true,
    queueOptions: {
      durable: true,
    },
  })
  async onReactionAdded(payload: MatrixReactionAddedEvent): Promise<void> {
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
      return new Nack(true) as unknown as void;
    }
  }

  /**
   * Receives reaction removed events from Matrix Adapter via RabbitMQ.
   *
   * Publishes internal 'reaction.removed' event for domain processing.
   */
  @RabbitSubscribe({
    queue: MatrixAdapterEventType.COMMUNICATION_REACTION_REMOVED,
    createQueueIfNotExists: true,
    queueOptions: {
      durable: true,
    },
  })
  async onReactionRemoved(payload: MatrixReactionRemovedEvent): Promise<void> {
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
        })
      );
    } catch (error) {
      this.logger.error(
        `Error handling reaction removed event: ${error}`,
        error instanceof Error ? error.stack : undefined,
        LogContext.COMMUNICATION
      );
      return new Nack(true) as unknown as void;
    }
  }
}
