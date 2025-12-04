import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CommunicationDeleteMessageInput } from './dto/communication.dto.message.delete';
import { IMessage } from '@domain/communication/message/message.interface';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  MatrixAdapterEventType,
  SyncActorRequest,
  SyncActorResponse,
  CreateRoomRequest,
  CreateRoomResponse,
  UpdateRoomRequest,
  UpdateRoomResponse,
  DeleteRoomRequest,
  DeleteRoomResponse,
  CreateSpaceRequest,
  CreateSpaceResponse,
  UpdateSpaceRequest,
  UpdateSpaceResponse,
  DeleteSpaceRequest,
  DeleteSpaceResponse,
  SetParentRequest,
  SetParentResponse,
  BatchAddMemberRequest,
  BatchAddMemberResponse,
  BatchRemoveMemberRequest,
  BatchRemoveMemberResponse,
  SendMessageRequest,
  SendMessageResponse,
  DeleteMessageRequest,
  DeleteMessageResponse,
  AddReactionRequest,
  AddReactionResponse,
  RemoveReactionRequest,
  RemoveReactionResponse,
  GetRoomRequest,
  GetRoomResponse,
  GetMessageRequest,
  GetMessageResponse,
  GetReactionRequest,
  GetReactionResponse,
  ListRoomsRequest,
  ListRoomsResponse,
  ListSpacesRequest,
  ListSpacesResponse,
  RoomTypeCommunity,
  RoomTypeDirect,
  AlkemioRoomID,
  AlkemioActorID,
  AlkemioContextID,
  RoomType,
  BaseResponse,
} from '@alkem-io/matrix-adapter-go-lib';
import { CommunicationSendMessageInput } from './dto/communication.dto.message.send';
import { getRandomId } from '@common/utils/random.id.generator.util';
import { stringifyWithoutAuthorizationMetaInfo } from '@common/utils/stringify.util';
import { CommunicationSendMessageReplyInput } from './dto/communications.dto.message.reply';
import { CommunicationAddReactionToMessageInput } from './dto/communication.dto.add.reaction';
import { CommunicationRoomResult } from '@services/adapters/communication-adapter/dto/communication.dto.room.result';
import { IMessageReaction } from '@domain/communication/message.reaction/message.reaction.interface';
import { AlkemioConfig } from '@src/types';
import { CommunicationRemoveReactionToMessageInput } from './dto/communication.dto.remove.reaction';
import { RoomType as AlkemioRoomType } from '@common/enums/room.type';
import { CommunicationAdapterException } from './communication.adapter.exception';

/** Options for RPC command execution */
interface RpcOptions<TResponse> {
  /** Operation name for logging and error context */
  operation: string;
  /** Event type to send */
  eventType: MatrixAdapterEventType;
  /** Request payload */
  payload: Record<string, unknown>;
  /** Context details for error reporting */
  errorContext?: Record<string, unknown>;
  /**
   * Error handling strategy:
   * - 'throw': Throw exception on transport error (default)
   * - 'silent': Log and return undefined on transport error
   * - 'boolean': Return false on transport error (for delete operations)
   */
  onError?: 'throw' | 'silent' | 'boolean';
  /**
   * Whether to check BaseResponse.success and throw on business logic errors.
   * Default: false (just return the response, let caller handle success check)
   */
  ensureSuccess?: boolean;
}

/**
 * CommunicationAdapter - Uses standard AMQP RPC for communication with Go Matrix Adapter
 *
 * Key features:
 * - Uses @golevelup/nestjs-rabbitmq AmqpConnection.request() for RPC
 * - Standard AMQP RPC: publishes to queue with correlation_id and reply_to properties
 * - Compatible with Watermill-based Go adapter via Direct Reply-To queue
 * - Uses Alkemio UUIDs exclusively (AlkemioActorID, AlkemioRoomID, AlkemioContextID)
 * - No Matrix ID management - adapter handles mapping internally
 * - Unified Actor Pattern: actorId = contributor.agent.id
 */
@Injectable()
export class CommunicationAdapter {
  private readonly enabled: boolean;
  private readonly rpcTimeout: number;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly amqpConnection: AmqpConnection
  ) {
    const communications = this.configService.get('communications');
    this.enabled = communications?.enabled ?? false;
    this.rpcTimeout = communications?.matrix?.connection_timeout ?? 10000;
  }

  // ============================================================================
  // Generic RPC Helper
  // ============================================================================

  /**
   * Send a command to the Matrix adapter via RabbitMQ using standard AMQP RPC.
   *
   * Uses @golevelup/nestjs-rabbitmq AmqpConnection.request() which:
   * - Publishes to the queue (eventType) with correlation_id and reply_to properties
   * - Uses Direct Reply-To queue (amq.rabbitmq.reply-to) for responses
   * - Is compatible with any AMQP RPC server (Go Watermill, etc.)
   *
   * @template TResponse - Response type that extends BaseResponse (flat structure with success/error)
   */
  private async sendCommand<TResponse extends BaseResponse>(
    options: RpcOptions<TResponse>
  ): Promise<TResponse | undefined> {
    const {
      operation,
      eventType,
      payload,
      errorContext,
      onError = 'throw',
      ensureSuccess = false,
    } = options;

    const eventID = this.logInputPayload(eventType, payload);

    try {
      // Use standard AMQP RPC via AmqpConnection.request()
      // - exchange: '' (default exchange) routes directly to queue by name
      // - routingKey: eventType (the queue name the Go adapter listens on)
      // - Sets correlation_id and reply_to automatically for RPC
      const response = await this.amqpConnection.request<TResponse>({
        exchange: '',
        routingKey: eventType,
        payload,
        timeout: this.rpcTimeout,
      });

      this.logResponsePayload(eventType, response, eventID);

      if (ensureSuccess) {
        // Response types extend BaseResponse, so success/error are direct properties
        this.ensureSuccess(operation, response, errorContext);
      }

      return response;
    } catch (err: unknown) {
      this.logInteractionError(eventType, err, eventID);

      // If it's already our exception (from ensureSuccess), always rethrow
      if (err instanceof CommunicationAdapterException) {
        throw err;
      }

      // Handle based on error strategy
      if (onError === 'throw') {
        throw CommunicationAdapterException.fromTransportError(
          operation,
          err,
          errorContext
        );
      }

      // Silent or boolean mode - log and return undefined
      this.logger.error(
        `${operation} failed`,
        err instanceof Error ? err.stack : undefined,
        LogContext.COMMUNICATION
      );
      return undefined;
    }
  }

  // ============================================================================
  // Actor Management (FR-010, FR-011)
  // ============================================================================

  /**
   * Sync an actor (user or virtual contributor) to Matrix.
   * Creates or updates the actor's profile in the Matrix adapter.
   */
  async syncActor(
    actorId: AlkemioActorID,
    displayName: string,
    avatarUrl?: string
  ): Promise<boolean> {
    if (!this.enabled) return true;

    const response = await this.sendCommand<SyncActorResponse>({
      operation: 'syncActor',
      eventType: MatrixAdapterEventType.COMMUNICATION_ACTOR_SYNC,
      payload: {
        actor_id: actorId,
        display_name: displayName,
        avatar_url: avatarUrl,
      } satisfies SyncActorRequest,
      errorContext: { actorId },
    });

    return response?.success ?? false;
  }

  // ============================================================================
  // Room Management (FR-005, FR-006)
  // ============================================================================

  /**
   * Create a new room in Matrix.
   * @param alkemioRoomId - Required: The Alkemio room UUID (must be saved to DB first)
   */
  async createRoom(
    alkemioRoomId: AlkemioRoomID,
    roomType: AlkemioRoomType,
    name?: string,
    initialMembers?: AlkemioActorID[],
    parentContextId?: AlkemioContextID
  ): Promise<boolean> {
    if (!this.enabled) return true;

    if (!alkemioRoomId) {
      throw CommunicationAdapterException.fromAdapterError('createRoom', {
        code: 'ErrCodeInvalidParam',
        message:
          'alkemioRoomId is required - ensure room is saved before calling createRoom',
      });
    }

    const response = await this.sendCommand<CreateRoomResponse>({
      operation: 'createRoom',
      eventType: MatrixAdapterEventType.COMMUNICATION_ROOM_CREATE,
      payload: {
        alkemio_room_id: alkemioRoomId,
        type: this.mapRoomType(roomType),
        name,
        initial_members: initialMembers,
        parent_context_id: parentContextId,
      } satisfies CreateRoomRequest,
      errorContext: { alkemioRoomId, roomType },
    });

    if (response?.success) {
      this.logger.verbose?.(
        `Created room: ${alkemioRoomId}`,
        LogContext.COMMUNICATION
      );
    }

    return response?.success ?? false;
  }

  /**
   * Update room properties.
   */
  async updateRoom(
    alkemioRoomId: AlkemioRoomID,
    name?: string,
    topic?: string,
    isPublic?: boolean
  ): Promise<boolean> {
    if (!this.enabled) return true;

    const response = await this.sendCommand<UpdateRoomResponse>({
      operation: 'updateRoom',
      eventType: MatrixAdapterEventType.COMMUNICATION_ROOM_UPDATE,
      payload: {
        alkemio_room_id: alkemioRoomId,
        name,
        topic,
        is_public: isPublic,
      } satisfies UpdateRoomRequest,
      errorContext: { alkemioRoomId },
    });

    return response?.success ?? false;
  }

  /**
   * Delete a room from Matrix.
   * Returns false on error (used by admin GraphQL mutation).
   */
  async deleteRoom(
    alkemioRoomId: AlkemioRoomID,
    reason?: string
  ): Promise<boolean> {
    if (!this.enabled) return true;

    const response = await this.sendCommand<DeleteRoomResponse>({
      operation: 'deleteRoom',
      eventType: MatrixAdapterEventType.COMMUNICATION_ROOM_DELETE,
      payload: {
        alkemio_room_id: alkemioRoomId,
        reason,
      } satisfies DeleteRoomRequest,
      errorContext: { alkemioRoomId },
      onError: 'boolean',
    });

    if (response?.success) {
      this.logger.verbose?.(
        `Deleted room: ${alkemioRoomId}`,
        LogContext.COMMUNICATION
      );
    }

    return response?.success ?? false;
  }

  /**
   * Get room details including messages and members.
   * Throws on error.
   *
   * TODO (FR-015): Add pagination support for messages when Go adapter supports it.
   * Current behavior returns all messages which may be problematic for high-volume rooms.
   */
  async getRoom(
    alkemioRoomId: AlkemioRoomID
  ): Promise<CommunicationRoomResult> {
    if (!this.enabled) {
      return {
        id: 'communications-not-enabled',
        messages: [],
        displayName: '',
        members: [],
      };
    }

    const response = await this.sendCommand<GetRoomResponse>({
      operation: 'getRoom',
      eventType: MatrixAdapterEventType.COMMUNICATION_ROOM_GET,
      payload: {
        alkemio_room_id: alkemioRoomId,
      } satisfies GetRoomRequest,
      errorContext: { alkemioRoomId },
      ensureSuccess: true,
    });

    return this.convertGetRoomResponseToCommunicationRoomResult(response!);
  }

  // ============================================================================
  // Space Management (FR-005)
  // ============================================================================

  /**
   * Create a new space (for organizing rooms hierarchically).
   */
  async createSpace(
    alkemioContextId: AlkemioContextID,
    name: string,
    parentContextId?: AlkemioContextID
  ): Promise<boolean> {
    if (!this.enabled) return true;

    const response = await this.sendCommand<CreateSpaceResponse>({
      operation: 'createSpace',
      eventType: MatrixAdapterEventType.COMMUNICATION_SPACE_CREATE,
      payload: {
        alkemio_context_id: alkemioContextId,
        name,
        parent_context_id: parentContextId,
      } satisfies CreateSpaceRequest,
      errorContext: { alkemioContextId },
    });

    if (response?.success) {
      this.logger.verbose?.(
        `Created space: ${alkemioContextId}`,
        LogContext.COMMUNICATION
      );
    }

    return response?.success ?? false;
  }

  /**
   * Update space properties.
   */
  async updateSpace(
    alkemioContextId: AlkemioContextID,
    name?: string,
    topic?: string
  ): Promise<boolean> {
    if (!this.enabled) return true;

    const response = await this.sendCommand<UpdateSpaceResponse>({
      operation: 'updateSpace',
      eventType: MatrixAdapterEventType.COMMUNICATION_SPACE_UPDATE,
      payload: {
        alkemio_context_id: alkemioContextId,
        name,
        topic,
      } satisfies UpdateSpaceRequest,
      errorContext: { alkemioContextId },
    });

    return response?.success ?? false;
  }

  /**
   * Delete a space from Matrix.
   * Returns false on error.
   */
  async deleteSpace(
    alkemioContextId: AlkemioContextID,
    reason?: string
  ): Promise<boolean> {
    if (!this.enabled) return true;

    const response = await this.sendCommand<DeleteSpaceResponse>({
      operation: 'deleteSpace',
      eventType: MatrixAdapterEventType.COMMUNICATION_SPACE_DELETE,
      payload: {
        alkemio_context_id: alkemioContextId,
        reason,
      } satisfies DeleteSpaceRequest,
      errorContext: { alkemioContextId },
      onError: 'boolean',
    });

    if (response?.success) {
      this.logger.verbose?.(
        `Deleted space: ${alkemioContextId}`,
        LogContext.COMMUNICATION
      );
    }

    return response?.success ?? false;
  }

  // ============================================================================
  // Hierarchy Management (FR-013)
  // ============================================================================

  /**
   * Set the parent space for a room or space.
   */
  async setParent(
    childId: string,
    isSpace: boolean,
    parentContextId: AlkemioContextID
  ): Promise<boolean> {
    if (!this.enabled) return true;

    const response = await this.sendCommand<SetParentResponse>({
      operation: 'setParent',
      eventType: MatrixAdapterEventType.COMMUNICATION_HIERARCHY_SET_PARENT,
      payload: {
        child_id: childId,
        is_space: isSpace,
        parent_context_id: parentContextId,
      } satisfies SetParentRequest,
      errorContext: { childId, isSpace, parentContextId },
    });

    return response?.success ?? false;
  }

  // ============================================================================
  // Membership Management (FR-005, FR-006)
  // ============================================================================

  /**
   * Add an actor to multiple rooms.
   * Returns false on error (graceful handling for "already member" cases).
   */
  async batchAddMember(
    actorId: AlkemioActorID,
    roomIds: AlkemioRoomID[]
  ): Promise<boolean> {
    if (!this.enabled || roomIds.length === 0) return true;

    const response = await this.sendCommand<BatchAddMemberResponse>({
      operation: 'batchAddMember',
      eventType: MatrixAdapterEventType.COMMUNICATION_ROOM_MEMBER_BATCH_ADD,
      payload: {
        actor_id: actorId,
        alkemio_room_ids: roomIds,
      } satisfies BatchAddMemberRequest,
      errorContext: { actorId, roomCount: roomIds.length },
      onError: 'boolean',
    });

    if (!response) {
      this.logger.warn(
        'Failed to add actor to rooms - may already be member',
        LogContext.COMMUNICATION
      );
    }

    return response?.success ?? false;
  }

  /**
   * Remove an actor from multiple rooms.
   */
  async batchRemoveMember(
    actorId: AlkemioActorID,
    roomIds: AlkemioRoomID[],
    reason?: string
  ): Promise<boolean> {
    if (!this.enabled || roomIds.length === 0) return true;

    const response = await this.sendCommand<BatchRemoveMemberResponse>({
      operation: 'batchRemoveMember',
      eventType: MatrixAdapterEventType.COMMUNICATION_ROOM_MEMBER_BATCH_REMOVE,
      payload: {
        actor_id: actorId,
        alkemio_room_ids: roomIds,
        reason,
      } satisfies BatchRemoveMemberRequest,
      errorContext: { actorId, roomCount: roomIds.length },
    });

    return response?.success ?? false;
  }

  // ============================================================================
  // Messaging (FR-007)
  // ============================================================================

  /**
   * Send a message to a room.
   * Throws on error.
   */
  async sendMessage(
    sendMessageData: CommunicationSendMessageInput
  ): Promise<IMessage> {
    if (!sendMessageData.roomID || sendMessageData.roomID.length === 0) {
      throw CommunicationAdapterException.fromAdapterError('sendMessage', {
        code: 'ErrCodeInvalidParam',
        message: 'Room ID is required to send a message',
      });
    }

    const response = await this.sendCommand<SendMessageResponse>({
      operation: 'sendMessage',
      eventType: MatrixAdapterEventType.COMMUNICATION_MESSAGE_SEND,
      payload: {
        alkemio_room_id: sendMessageData.roomID,
        sender_actor_id: sendMessageData.actorId,
        content: sendMessageData.message,
      } satisfies SendMessageRequest,
      errorContext: { roomID: sendMessageData.roomID },
      ensureSuccess: true,
    });

    this.logger.verbose?.(
      `Message sent to room: ${sendMessageData.roomID}`,
      LogContext.COMMUNICATION
    );

    return {
      id: response!.message_id,
      message: sendMessageData.message,
      sender: sendMessageData.actorId,
      senderType: 'user',
      timestamp: Number.parseFloat(response!.timestamp),
      threadID: undefined,
      reactions: [],
    };
  }

  /**
   * Send a reply to a message (threaded message).
   * Throws on error.
   */
  async sendMessageReply(
    sendMessageData: CommunicationSendMessageReplyInput,
    senderType: 'user' | 'virtualContributor'
  ): Promise<IMessage> {
    const response = await this.sendCommand<SendMessageResponse>({
      operation: 'sendMessageReply',
      eventType: MatrixAdapterEventType.COMMUNICATION_MESSAGE_SEND,
      payload: {
        alkemio_room_id: sendMessageData.roomID,
        sender_actor_id: sendMessageData.actorId,
        content: sendMessageData.message,
        parent_message_id: sendMessageData.threadID,
      } satisfies SendMessageRequest,
      errorContext: { roomID: sendMessageData.roomID },
      ensureSuccess: true,
    });

    this.logger.verbose?.(
      `Reply sent to room: ${sendMessageData.roomID}`,
      LogContext.COMMUNICATION
    );

    return {
      id: response!.message_id,
      message: sendMessageData.message,
      sender: sendMessageData.actorId,
      senderType,
      timestamp: Number.parseFloat(response!.timestamp),
      threadID: sendMessageData.threadID,
      reactions: [],
    };
  }

  /**
   * Delete a message from a room.
   * Throws on error.
   */
  async deleteMessage(
    deleteMessageData: CommunicationDeleteMessageInput
  ): Promise<string> {
    await this.sendCommand<DeleteMessageResponse>({
      operation: 'deleteMessage',
      eventType: MatrixAdapterEventType.COMMUNICATION_MESSAGE_DELETE,
      payload: {
        alkemio_room_id: deleteMessageData.roomID,
        message_id: deleteMessageData.messageId,
        sender_actor_id: deleteMessageData.actorId,
      } satisfies DeleteMessageRequest,
      errorContext: {
        roomID: deleteMessageData.roomID,
        messageId: deleteMessageData.messageId,
      },
      ensureSuccess: true,
    });

    return deleteMessageData.messageId;
  }

  // ============================================================================
  // Reactions (FR-007)
  // ============================================================================

  /**
   * Add a reaction to a message.
   * Throws on error.
   */
  async addReaction(
    reactionData: CommunicationAddReactionToMessageInput
  ): Promise<IMessageReaction> {
    const response = await this.sendCommand<AddReactionResponse>({
      operation: 'addReaction',
      eventType: MatrixAdapterEventType.COMMUNICATION_REACTION_ADD,
      payload: {
        alkemio_room_id: reactionData.alkemioRoomId,
        message_id: reactionData.messageId,
        sender_actor_id: reactionData.actorId,
        emoji: reactionData.emoji,
      } satisfies AddReactionRequest,
      errorContext: {
        alkemioRoomId: reactionData.alkemioRoomId,
        messageId: reactionData.messageId,
      },
      ensureSuccess: true,
    });

    this.logger.verbose?.(
      `Reaction added to message in room: ${reactionData.alkemioRoomId}`,
      LogContext.COMMUNICATION
    );

    return {
      id: response!.reaction_id,
      emoji: reactionData.emoji,
      sender: reactionData.actorId,
      senderType: 'user',
      timestamp: Date.now(),
    };
  }

  /**
   * Remove a reaction from a message.
   * Throws on error.
   */
  async removeReaction(
    removeReactionData: CommunicationRemoveReactionToMessageInput
  ): Promise<string> {
    await this.sendCommand<RemoveReactionResponse>({
      operation: 'removeReaction',
      eventType: MatrixAdapterEventType.COMMUNICATION_REACTION_REMOVE,
      payload: {
        alkemio_room_id: removeReactionData.alkemioRoomId,
        reaction_id: removeReactionData.reactionId,
        sender_actor_id: removeReactionData.actorId,
      } satisfies RemoveReactionRequest,
      errorContext: {
        alkemioRoomId: removeReactionData.alkemioRoomId,
        reactionId: removeReactionData.reactionId,
      },
      ensureSuccess: true,
    });

    return removeReactionData.reactionId;
  }

  // ============================================================================
  // Message and Reaction Lookup (for authorization)
  // ============================================================================

  /**
   * Get the sender actor ID of a message (for authorization).
   * Returns empty string on error.
   */
  async getMessageSenderActor(data: {
    alkemioRoomId: AlkemioRoomID;
    messageId: string;
  }): Promise<AlkemioActorID> {
    if (!this.enabled) return '';

    const response = await this.sendCommand<GetMessageResponse>({
      operation: 'getMessageSenderActor',
      eventType: MatrixAdapterEventType.COMMUNICATION_MESSAGE_GET,
      payload: {
        alkemio_room_id: data.alkemioRoomId,
        message_id: data.messageId,
      } satisfies GetMessageRequest,
      errorContext: {
        alkemioRoomId: data.alkemioRoomId,
        messageId: data.messageId,
      },
      onError: 'silent',
    });

    return response?.message.sender_actor_id ?? '';
  }

  /**
   * Get the sender actor ID of a reaction (for authorization).
   * Returns empty string on error.
   */
  async getReactionSenderActor(data: {
    alkemioRoomId: AlkemioRoomID;
    reactionId: string;
  }): Promise<AlkemioActorID> {
    if (!this.enabled) return '';

    const response = await this.sendCommand<GetReactionResponse>({
      operation: 'getReactionSenderActor',
      eventType: MatrixAdapterEventType.COMMUNICATION_REACTION_GET,
      payload: {
        alkemio_room_id: data.alkemioRoomId,
        reaction_id: data.reactionId,
      } satisfies GetReactionRequest,
      errorContext: {
        alkemioRoomId: data.alkemioRoomId,
        reactionId: data.reactionId,
      },
      onError: 'silent',
    });

    return response?.reaction.sender_actor_id ?? '';
  }

  // ============================================================================
  // Admin Functions (FR-008)
  // ============================================================================

  /**
   * List all rooms.
   * Throws on error.
   *
   * TODO (FR-015): Add pagination support when Go adapter supports it.
   * Current behavior returns all rooms which may be problematic at scale.
   */
  async listRooms(): Promise<AlkemioRoomID[]> {
    if (!this.enabled) return [];

    const response = await this.sendCommand<ListRoomsResponse>({
      operation: 'listRooms',
      eventType: MatrixAdapterEventType.COMMUNICATION_ROOM_LIST,
      payload: {} satisfies ListRoomsRequest,
      ensureSuccess: true,
    });

    return response!.alkemio_room_ids;
  }

  /**
   * List all spaces.
   * Throws on error.
   *
   * TODO (FR-015): Add pagination support when Go adapter supports it.
   * Current behavior returns all spaces which may be problematic at scale.
   */
  async listSpaces(): Promise<AlkemioContextID[]> {
    if (!this.enabled) return [];

    const response = await this.sendCommand<ListSpacesResponse>({
      operation: 'listSpaces',
      eventType: MatrixAdapterEventType.COMMUNICATION_SPACE_LIST,
      payload: {} satisfies ListSpacesRequest,
      ensureSuccess: true,
    });

    return response!.alkemio_context_ids;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mapRoomType(alkemioType: AlkemioRoomType): RoomType {
    if (alkemioType === AlkemioRoomType.CONVERSATION_DIRECT) {
      return RoomTypeDirect;
    }
    return RoomTypeCommunity;
  }

  private convertGetRoomResponseToCommunicationRoomResult(
    response: GetRoomResponse
  ): CommunicationRoomResult {
    return {
      id: response.alkemio_room_id,
      displayName: response.display_name,
      members: response.member_actor_ids,
      messages: response.messages.map(msg => ({
        id: msg.id,
        message: msg.content,
        sender: msg.sender_actor_id,
        senderType: 'user' as const,
        timestamp: Number.parseFloat(msg.timestamp),
        threadID: msg.thread_id,
        reactions: msg.reactions.map(r => ({
          id: r.id,
          emoji: r.emoji,
          sender: r.sender_actor_id,
          senderType: 'user' as const,
          timestamp: Number.parseFloat(r.timestamp),
        })),
      })),
    };
  }

  private logInputPayload(
    event: MatrixAdapterEventType,
    payload: unknown
  ): number {
    const randomID = getRandomId();
    const payloadData = stringifyWithoutAuthorizationMetaInfo(payload);
    this.logger.verbose?.(
      `[${event}-${randomID}] - Input payload: ${payloadData}`,
      LogContext.COMMUNICATION
    );
    return randomID;
  }

  private logResponsePayload(
    event: MatrixAdapterEventType,
    payload: unknown,
    eventID: number
  ): void {
    const loggedData = stringifyWithoutAuthorizationMetaInfo(payload);
    this.logger.verbose?.(
      `[${event}-${eventID}] - Response payload: ${loggedData}`,
      LogContext.COMMUNICATION
    );
  }

  private logInteractionError(
    event: MatrixAdapterEventType,
    error: unknown,
    eventID: number
  ): void {
    this.logger.warn(
      `[${event}-${eventID}] - Error: ${JSON.stringify(error)}`,
      LogContext.COMMUNICATION
    );
  }

  /**
   * Check response for business logic errors (success=false with error code).
   * Throws CommunicationAdapterException if the operation failed.
   */
  private ensureSuccess(
    operation: string,
    response: {
      success: boolean;
      error?: { code: string; message: string; details?: string };
    },
    details?: Record<string, unknown>
  ): void {
    if (!response.success && response.error) {
      throw CommunicationAdapterException.fromAdapterError(
        operation,
        response.error,
        details
      );
    }
  }
}
