import {
  AddReactionRequest,
  AlkemioActorID,
  AlkemioContextID,
  // ID type aliases
  AlkemioRoomID,
  BatchAddMemberRequest,
  BatchAddSpaceMemberRequest,
  BatchGetLastMessagesRequest,
  BatchGetUnreadCountsRequest,
  BatchRemoveMemberRequest,
  BatchRemoveSpaceMemberRequest,
  // Type-safe command registry types
  CommandTopic,
  CreateRoomRequest,
  CreateSpaceRequest,
  DeleteMessageRequest,
  DeleteRoomRequest,
  DeleteSpaceRequest,
  GetLastMessageRequest,
  GetMessageRequest,
  GetReactionRequest,
  GetRoomAsUserRequest,
  GetRoomAsUserResponse,
  GetRoomMembersRequest,
  GetRoomRequest,
  // Response type for converter helper
  GetRoomResponse,
  GetSpaceRequest,
  GetThreadMessagesRequest,
  GetUnreadCountsRequest,
  ListRoomsRequest,
  ListSpacesRequest,
  MarkMessageReadRequest,
  // Event types (topics)
  MatrixAdapterEventType,
  RemoveReactionRequest,
  RequestFor,
  ResponseFor,
  RoomType,
  // Room type constants
  RoomTypeCommunity,
  RoomTypeDirect,
  SendMessageRequest,
  SetParentRequest,
  // Request types (used with `satisfies` for payload validation)
  SyncActorRequest,
  UpdateRoomRequest,
  UpdateSpaceRequest,
} from '@alkemio/matrix-adapter-lib';
import { LogContext } from '@common/enums';
import { RoomType as AlkemioRoomType } from '@common/enums/room.type';
import { getRandomId } from '@common/utils/random.id.generator.util';
import { stringifyWithoutAuthorizationMetaInfo } from '@common/utils/stringify.util';
import { IMessage } from '@domain/communication/message/message.interface';
import { IMessageReaction } from '@domain/communication/message.reaction/message.reaction.interface';
import { IRoomWithReadState } from '@domain/communication/room/room.with.read.state.interface';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommunicationRoomResult } from '@services/adapters/communication-adapter/dto/communication.dto.room.result';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CommunicationAdapterException } from './communication.adapter.exception';
import { CommunicationAddReactionToMessageInput } from './dto/communication.dto.add.reaction';
import { CommunicationDeleteMessageInput } from './dto/communication.dto.message.delete';
import { CommunicationSendMessageInput } from './dto/communication.dto.message.send';
import { CommunicationRemoveReactionToMessageInput } from './dto/communication.dto.remove.reaction';
import { CommunicationSendMessageReplyInput } from './dto/communications.dto.message.reply';

/**
 * Options for RPC command execution.
 * Uses the Commands registry from @alkemio/matrix-adapter-lib for type-safe mapping.
 *
 * @template T - Command topic from the Commands registry
 */
interface RpcOptions<T extends CommandTopic> {
  /** Operation name for logging and error context */
  operation: string;
  /** Command topic - determines the request/response types automatically */
  topic: T;
  /** Request payload - must match RequestFor<T> */
  payload: RequestFor<T>;
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
 * - Type-safe command mapping via Commands registry from @alkemio/matrix-adapter-lib
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
   * @template T - Command topic from the Commands registry, determines request/response types
   */
  private async sendCommand<T extends CommandTopic>(
    options: RpcOptions<T>
  ): Promise<ResponseFor<T> | undefined> {
    const {
      operation,
      topic,
      payload,
      errorContext,
      onError = 'throw',
      ensureSuccess = false,
    } = options;

    const eventID = this.logInputPayload(topic, payload);

    try {
      // Use standard AMQP RPC via AmqpConnection.request()
      // - exchange: '' (default exchange) routes directly to queue by name
      // - routingKey: topic (the queue name the Go adapter listens on)
      // - Sets correlation_id and reply_to automatically for RPC
      const response = await this.amqpConnection.request<ResponseFor<T>>({
        exchange: '',
        routingKey: topic,
        payload,
        timeout: this.rpcTimeout,
      });

      this.logResponsePayload(topic, response, eventID);

      if (ensureSuccess) {
        // Response types extend BaseResponse, so success/error are direct properties
        this.ensureSuccess(operation, response, errorContext);
      }

      return response;
    } catch (err: unknown) {
      this.logInteractionError(topic, err, eventID);

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

    const response = await this.sendCommand({
      operation: 'syncActor',
      topic: MatrixAdapterEventType.COMMUNICATION_ACTOR_SYNC,
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

    const response = await this.sendCommand({
      operation: 'createRoom',
      topic: MatrixAdapterEventType.COMMUNICATION_ROOM_CREATE,
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

    const response = await this.sendCommand({
      operation: 'updateRoom',
      topic: MatrixAdapterEventType.COMMUNICATION_ROOM_UPDATE,
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

    const response = await this.sendCommand({
      operation: 'deleteRoom',
      topic: MatrixAdapterEventType.COMMUNICATION_ROOM_DELETE,
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
        messagesCount: 0,
      };
    }

    const response = await this.sendCommand({
      operation: 'getRoom',
      topic: MatrixAdapterEventType.COMMUNICATION_ROOM_GET,
      payload: {
        alkemio_room_id: alkemioRoomId,
      } satisfies GetRoomRequest,
      errorContext: { alkemioRoomId },
      ensureSuccess: true,
    });

    // Response is guaranteed non-null when ensureSuccess: true (throws on failure)
    return this.convertGetRoomResponseToCommunicationRoomResult(response!);
  }

  /**
   * Get room content with read state for a specific user.
   * Returns messages with isRead flag and unread count.
   */
  async getRoomAsUser(
    alkemioRoomId: AlkemioRoomID,
    actorId: AlkemioActorID
  ): Promise<IRoomWithReadState> {
    if (!this.enabled) {
      return {
        id: 'communications-not-enabled',
        messages: [],
        displayName: '',
        messagesCount: 0,
        members: [],
        unreadCount: 0,
      };
    }

    this.logger.verbose?.(
      `Getting room as user: roomId=${alkemioRoomId}, actorId=${actorId}`,
      LogContext.COMMUNICATION
    );

    const response = await this.sendCommand({
      operation: 'getRoomAsUser',
      topic: MatrixAdapterEventType.COMMUNICATION_ROOM_GET_AS_USER,
      payload: {
        alkemio_room_id: alkemioRoomId,
        actor_id: actorId,
      } satisfies GetRoomAsUserRequest,
      errorContext: { alkemioRoomId, actorId },
      ensureSuccess: true,
    });

    // Response is guaranteed non-null when ensureSuccess: true (throws on failure)
    return this.convertGetRoomAsUserResponseToResult(response!);
  }

  /**
   * Get room members only (lightweight alternative to getRoom).
   * Use this when you only need membership info, not messages.
   */
  async getRoomMembers(
    alkemioRoomId: AlkemioRoomID
  ): Promise<AlkemioActorID[]> {
    if (!this.enabled) return [];

    const response = await this.sendCommand({
      operation: 'getRoomMembers',
      topic: MatrixAdapterEventType.COMMUNICATION_ROOM_MEMBERS_GET,
      payload: {
        alkemio_room_id: alkemioRoomId,
      } satisfies GetRoomMembersRequest,
      errorContext: { alkemioRoomId },
      ensureSuccess: true,
    });

    return response?.member_actor_ids ?? [];
  }

  /**
   * Get messages in a thread (lightweight alternative to getRoom).
   * Use this when you only need thread messages, not full room data.
   */
  async getThreadMessages(
    alkemioRoomId: AlkemioRoomID,
    threadId: string
  ): Promise<IMessage[]> {
    if (!this.enabled) return [];

    const response = await this.sendCommand({
      operation: 'getThreadMessages',
      topic: MatrixAdapterEventType.COMMUNICATION_THREAD_MESSAGES_GET,
      payload: {
        alkemio_room_id: alkemioRoomId,
        thread_id: threadId,
      } satisfies GetThreadMessagesRequest,
      errorContext: { alkemioRoomId, threadRootId: threadId },
      ensureSuccess: true,
    });

    return (response?.messages ?? []).map(msg =>
      this.convertMessageDtoToIMessage(msg)
    );
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

    const response = await this.sendCommand({
      operation: 'createSpace',
      topic: MatrixAdapterEventType.COMMUNICATION_SPACE_CREATE,
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

    const response = await this.sendCommand({
      operation: 'updateSpace',
      topic: MatrixAdapterEventType.COMMUNICATION_SPACE_UPDATE,
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

    const response = await this.sendCommand({
      operation: 'deleteSpace',
      topic: MatrixAdapterEventType.COMMUNICATION_SPACE_DELETE,
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

    const response = await this.sendCommand({
      operation: 'setParent',
      topic: MatrixAdapterEventType.COMMUNICATION_HIERARCHY_SET_PARENT,
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

    const response = await this.sendCommand({
      operation: 'batchAddMember',
      topic: MatrixAdapterEventType.COMMUNICATION_ROOM_MEMBER_BATCH_ADD,
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

    const response = await this.sendCommand({
      operation: 'batchRemoveMember',
      topic: MatrixAdapterEventType.COMMUNICATION_ROOM_MEMBER_BATCH_REMOVE,
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

    const response = await this.sendCommand({
      operation: 'sendMessage',
      topic: MatrixAdapterEventType.COMMUNICATION_MESSAGE_SEND,
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
      timestamp: response!.timestamp,
      threadID: undefined,
      reactions: [],
    };
  }

  /**
   * Send a reply to a message (threaded message).
   * Throws on error.
   */
  async sendMessageReply(
    sendMessageData: CommunicationSendMessageReplyInput
  ): Promise<IMessage> {
    const response = await this.sendCommand({
      operation: 'sendMessageReply',
      topic: MatrixAdapterEventType.COMMUNICATION_MESSAGE_SEND,
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
      timestamp: response!.timestamp,
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
    await this.sendCommand({
      operation: 'deleteMessage',
      topic: MatrixAdapterEventType.COMMUNICATION_MESSAGE_DELETE,
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
    const response = await this.sendCommand({
      operation: 'addReaction',
      topic: MatrixAdapterEventType.COMMUNICATION_REACTION_ADD,
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
      timestamp: response!.timestamp,
    };
  }

  /**
   * Remove a reaction from a message.
   * Throws on error.
   */
  async removeReaction(
    removeReactionData: CommunicationRemoveReactionToMessageInput
  ): Promise<string> {
    await this.sendCommand({
      operation: 'removeReaction',
      topic: MatrixAdapterEventType.COMMUNICATION_REACTION_REMOVE,
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
  // Message and Reaction Lookup
  // ============================================================================

  /**
   * Get a single message by ID from a room.
   * More efficient than getRoom() when you only need one message.
   */
  async getMessage(data: {
    alkemioRoomId: AlkemioRoomID;
    messageId: string;
  }): Promise<IMessage | undefined> {
    if (!this.enabled) return undefined;

    const response = await this.sendCommand({
      operation: 'getMessage',
      topic: MatrixAdapterEventType.COMMUNICATION_MESSAGE_GET,
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

    if (!response?.message) {
      return undefined;
    }

    return this.convertMessageDtoToIMessage(response.message);
  }

  /**
   * Get the sender actor ID of a message (for authorization).
   * Returns empty string on error.
   */
  async getMessageSenderActor(data: {
    alkemioRoomId: AlkemioRoomID;
    messageId: string;
  }): Promise<AlkemioActorID> {
    if (!this.enabled) return '';

    const response = await this.sendCommand({
      operation: 'getMessageSenderActor',
      topic: MatrixAdapterEventType.COMMUNICATION_MESSAGE_GET,
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

    return response?.message?.sender_actor_id ?? '';
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

    const response = await this.sendCommand({
      operation: 'getReactionSenderActor',
      topic: MatrixAdapterEventType.COMMUNICATION_REACTION_GET,
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

    return response?.reaction?.sender_actor_id ?? '';
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

    const response = await this.sendCommand({
      operation: 'listRooms',
      topic: MatrixAdapterEventType.COMMUNICATION_ROOM_LIST,
      payload: {} satisfies ListRoomsRequest,
      ensureSuccess: true,
    });

    return response!.alkemio_room_ids ?? [];
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

    const response = await this.sendCommand({
      operation: 'listSpaces',
      topic: MatrixAdapterEventType.COMMUNICATION_SPACE_LIST,
      payload: {} satisfies ListSpacesRequest,
      ensureSuccess: true,
    });

    return response!.alkemio_context_ids ?? [];
  }

  /**
   * Mark a message as read for a specific actor.
   * Updates read receipts in Matrix.
   */
  async markMessageRead(
    actorId: AlkemioActorID,
    alkemioRoomId: AlkemioRoomID,
    messageId: string,
    threadId?: string
  ): Promise<void> {
    if (!this.enabled) return;

    await this.sendCommand({
      operation: 'markMessageRead',
      topic: MatrixAdapterEventType.COMMUNICATION_MESSAGE_READ,
      payload: {
        actor_id: actorId,
        alkemio_room_id: alkemioRoomId,
        message_id: messageId,
        thread_id: threadId,
      } satisfies MarkMessageReadRequest,
      errorContext: { actorId, alkemioRoomId, messageId },
      ensureSuccess: true,
    });

    this.logger.verbose?.(
      `Marked message as read: ${messageId} in room ${alkemioRoomId}`,
      LogContext.COMMUNICATION
    );
  }

  /**
   * Get unread message counts for a room and optionally specific threads.
   * Returns room-level unread count and per-thread unread counts.
   */
  async getUnreadCounts(
    actorId: AlkemioActorID,
    alkemioRoomId: AlkemioRoomID,
    threadIds?: string[]
  ): Promise<{
    roomUnreadCount: number;
    threadUnreadCounts?: Record<string, number>;
  }> {
    if (!this.enabled) return { roomUnreadCount: 0 };

    const response = await this.sendCommand({
      operation: 'getUnreadCounts',
      topic: MatrixAdapterEventType.COMMUNICATION_ROOM_UNREAD_COUNTS_GET,
      payload: {
        actor_id: actorId,
        alkemio_room_id: alkemioRoomId,
        thread_ids: threadIds,
      } satisfies GetUnreadCountsRequest,
      errorContext: { actorId, alkemioRoomId },
      ensureSuccess: true,
    });

    return {
      roomUnreadCount: response!.room_unread_count,
      threadUnreadCounts: response!.thread_unread_counts,
    };
  }

  /**
   * Get unread message counts for multiple rooms in a single batch request.
   * More efficient than calling getUnreadCounts for each room individually.
   */
  async batchGetUnreadCounts(
    actorId: AlkemioActorID,
    alkemioRoomIds: AlkemioRoomID[]
  ): Promise<Record<string, number>> {
    if (!this.enabled || alkemioRoomIds.length === 0) return {};

    const response = await this.sendCommand({
      operation: 'batchGetUnreadCounts',
      topic: MatrixAdapterEventType.COMMUNICATION_ROOM_BATCH_UNREAD_COUNTS_GET,
      payload: {
        actor_id: actorId,
        alkemio_room_ids: alkemioRoomIds,
      } satisfies BatchGetUnreadCountsRequest,
      errorContext: { actorId, roomCount: alkemioRoomIds.length },
      ensureSuccess: true,
    });

    return response!.unread_counts ?? {};
  }

  /**
   * Get the last message from a room.
   * Useful for displaying conversation previews without fetching all messages.
   */
  async getLastMessage(alkemioRoomId: AlkemioRoomID): Promise<IMessage | null> {
    if (!this.enabled) return null;

    const response = await this.sendCommand({
      operation: 'getLastMessage',
      topic: MatrixAdapterEventType.COMMUNICATION_ROOM_LAST_MESSAGE_GET,
      payload: {
        alkemio_room_id: alkemioRoomId,
      } satisfies GetLastMessageRequest,
      errorContext: { alkemioRoomId },
      ensureSuccess: true,
    });

    if (!response?.message) return null;

    return this.convertMessageDtoToIMessage(response.message);
  }

  /**
   * Get last messages for multiple rooms in a single batch request.
   * More efficient than calling getLastMessage for each room individually.
   * Useful for populating conversation list previews.
   */
  async batchGetLastMessages(
    alkemioRoomIds: AlkemioRoomID[]
  ): Promise<Record<string, IMessage | null>> {
    if (!this.enabled || alkemioRoomIds.length === 0) return {};

    const response = await this.sendCommand({
      operation: 'batchGetLastMessages',
      topic: MatrixAdapterEventType.COMMUNICATION_ROOM_BATCH_LAST_MESSAGES_GET,
      payload: {
        alkemio_room_ids: alkemioRoomIds,
      } satisfies BatchGetLastMessagesRequest,
      errorContext: { roomCount: alkemioRoomIds.length },
      ensureSuccess: true,
    });

    const result: Record<string, IMessage | null> = {};
    const messages = response?.messages ?? {};

    for (const roomId of alkemioRoomIds) {
      const msgDto = messages[roomId];
      result[roomId] = msgDto ? this.convertMessageDtoToIMessage(msgDto) : null;
    }

    return result;
  }

  /**
   * Get details of a Matrix space.
   * Returns null if space not found.
   */
  async getSpace(alkemioContextId: AlkemioContextID): Promise<{
    contextId: string;
    displayName: string;
    topic?: string;
    avatarUrl?: string;
    joinRule: string;
    memberActorIds: string[];
    parentContextId?: string;
  } | null> {
    if (!this.enabled) return null;

    const response = await this.sendCommand({
      operation: 'getSpace',
      topic: MatrixAdapterEventType.COMMUNICATION_SPACE_GET,
      payload: {
        alkemio_context_id: alkemioContextId,
      } satisfies GetSpaceRequest,
      errorContext: { alkemioContextId },
      onError: 'silent',
    });

    if (!response) return null;

    return {
      contextId: response.alkemio_context_id,
      displayName: response.display_name,
      topic: response.topic,
      avatarUrl: response.avatar_url,
      joinRule: response.join_rule,
      memberActorIds: response.member_actor_ids,
      parentContextId: response.parent_context_id,
    };
  }

  /**
   * Add an actor to multiple Matrix spaces.
   */
  async batchAddSpaceMember(
    actorId: AlkemioActorID,
    contextIds: AlkemioContextID[]
  ): Promise<boolean> {
    if (!this.enabled || contextIds.length === 0) return true;

    const response = await this.sendCommand({
      operation: 'batchAddSpaceMember',
      topic: MatrixAdapterEventType.COMMUNICATION_SPACE_MEMBER_BATCH_ADD,
      payload: {
        actor_id: actorId,
        alkemio_context_ids: contextIds,
      } satisfies BatchAddSpaceMemberRequest,
      errorContext: { actorId, contextCount: contextIds.length },
      onError: 'boolean',
    });

    if (!response) {
      this.logger.warn(
        'Failed to add actor to spaces - may already be member',
        LogContext.COMMUNICATION
      );
    }

    return response?.success ?? false;
  }

  /**
   * Remove an actor from multiple Matrix spaces.
   */
  async batchRemoveSpaceMember(
    actorId: AlkemioActorID,
    contextIds: AlkemioContextID[],
    reason?: string
  ): Promise<boolean> {
    if (!this.enabled || contextIds.length === 0) return true;

    const response = await this.sendCommand({
      operation: 'batchRemoveSpaceMember',
      topic: MatrixAdapterEventType.COMMUNICATION_SPACE_MEMBER_BATCH_REMOVE,
      payload: {
        actor_id: actorId,
        alkemio_context_ids: contextIds,
        reason,
      } satisfies BatchRemoveSpaceMemberRequest,
      errorContext: { actorId, contextCount: contextIds.length },
    });

    return response?.success ?? false;
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
    const messages = (response.messages ?? []).map(msg =>
      this.convertMessageDtoToIMessage(msg)
    );
    return {
      id: response.alkemio_room_id,
      displayName: response.display_name,
      members: response.member_actor_ids ?? [],
      messages,
      messagesCount: messages.length,
    };
  }

  /**
   * Convert GetRoomAsUserResponse to IRoomWithReadState.
   */
  private convertGetRoomAsUserResponseToResult(
    response: GetRoomAsUserResponse
  ): IRoomWithReadState {
    const messages = (response.messages ?? []).map(msg =>
      this.convertMessageDtoToIMessage(msg)
    );
    return {
      id: response.alkemio_room_id,
      displayName: response.display_name,
      members: response.member_actor_ids ?? [],
      messages,
      messagesCount: messages.length,
      lastReadEventId: response.last_read_event_id,
      unreadCount: response.unread_count,
    };
  }

  /**
   * Convert a MessageDto from the Go adapter to an IMessage.
   */
  private convertMessageDtoToIMessage(msg: {
    id: string;
    content: string;
    sender_actor_id: string;
    timestamp: number;
    thread_id?: string;
    reactions?: Array<{
      id: string;
      emoji: string;
      sender_actor_id: string;
      timestamp: number;
    }>;
  }): IMessage {
    return {
      id: msg.id,
      message: msg.content,
      sender: msg.sender_actor_id,
      timestamp: msg.timestamp,
      threadID: msg.thread_id,
      reactions: (msg.reactions ?? []).map(r => ({
        id: r.id,
        emoji: r.emoji,
        sender: r.sender_actor_id,
        timestamp: r.timestamp,
      })),
    };
  }

  private logInputPayload(topic: string, payload: unknown): number {
    const randomID = getRandomId();
    const payloadData = stringifyWithoutAuthorizationMetaInfo(payload);
    this.logger.verbose?.(
      `[${topic}-${randomID}] - Input payload: ${payloadData}`,
      LogContext.COMMUNICATION
    );
    return randomID;
  }

  private logResponsePayload(
    topic: string,
    payload: unknown,
    eventID: number
  ): void {
    const loggedData = stringifyWithoutAuthorizationMetaInfo(payload);
    this.logger.verbose?.(
      `[${topic}-${eventID}] - Response payload: ${loggedData}`,
      LogContext.COMMUNICATION
    );
  }

  private logInteractionError(
    topic: string,
    error: unknown,
    eventID: number
  ): void {
    this.logger.warn(
      `[${topic}-${eventID}] - Error: ${JSON.stringify(error)}`,
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
