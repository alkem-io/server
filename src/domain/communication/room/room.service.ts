import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { RoomType } from '@common/enums/room.type';
import { ValidationException } from '@common/exceptions';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import {
  isRoomNotFoundError,
  isTransportError,
} from '@services/adapters/communication-adapter/communication.adapter.exception';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { IMessage } from '../message/message.interface';
import { IMessageReaction } from '../message.reaction/message.reaction.interface';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import { RoomAddReactionToMessageInput } from './dto/room.dto.add.reaction.to.message';
import { CreateRoomInput } from './dto/room.dto.create';
import { DeleteRoomInput } from './dto/room.dto.delete';
import { RoomMarkMessageReadInput } from './dto/room.dto.mark.message.read';
import { RoomRemoveMessageInput } from './dto/room.dto.remove.message';
import { RoomRemoveReactionToMessageInput } from './dto/room.dto.remove.message.reaction';
import { RoomUnreadCounts } from './dto/room.dto.unread.counts';
import { Room } from './room.entity';
import { IRoom } from './room.interface';

/** The owner-derived part of a room creation request; the rest comes from the Room row. */
export type ExternalRoomContext = Omit<
  CreateRoomInput,
  'displayName' | 'type' | 'avatarUrl'
>;

@Injectable()
export class RoomService {
  constructor(
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    private readonly communicationAdapter: CommunicationAdapter,
    private readonly roomLookupService: RoomLookupService,
    private readonly actorLookupService: ActorLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createRoom(roomData: CreateRoomInput): Promise<IRoom> {
    const room = new Room(roomData.displayName, roomData.type);
    room.authorization = new AuthorizationPolicy(AuthorizationPolicyType.ROOM);
    room.messagesCount = 0;
    room.vcInteractionsByThread = {};
    if (roomData.avatarUrl) {
      room.avatarUrl = roomData.avatarUrl;
    }

    // Save first to get the ID assigned by the database
    const savedRoom = await this.save(room);

    // Now create the external room with the assigned ID. A room row without
    // its Matrix room is unusable (every read throws ROOM_NOT_FOUND) and no
    // caller can tell it apart from a healthy one, so creation is all-or-
    // nothing: on failure the row is removed and the error propagates to the
    // caller, whose own rollback / user-facing error then applies.
    try {
      await this.createExternalCommunicationRoom(savedRoom, roomData);
    } catch (error: unknown) {
      await this.removeRoomAfterFailedExternalCreate(savedRoom, error);
      throw error;
    }
    return savedRoom;
  }

  /**
   * Make sure the Matrix room behind an existing Room row exists, creating it
   * from the row (id, type, display name, avatar) plus the owner-derived
   * `context` when it does not. A `context` function is only called when the
   * Matrix room turns out to be missing. Idempotent: an existing Matrix room is left
   * untouched.
   *
   * @returns true when the Matrix room had to be created, false when it was
   *   already there.
   */
  async ensureExternalRoom(
    room: IRoom,
    context: ExternalRoomContext | (() => Promise<ExternalRoomContext>) = {}
  ): Promise<boolean> {
    try {
      // The members lookup resolves the room the same way every read does and
      // answers ROOM_NOT_FOUND for a row whose Matrix room is missing, without
      // fetching its messages. Anything else (including a transport error) is
      // not evidence of absence and must not trigger a create.
      await this.communicationAdapter.getRoomMembers(room.id);
      return false;
    } catch (error: unknown) {
      if (!isRoomNotFoundError(error)) {
        throw error;
      }
    }

    const resolvedContext =
      typeof context === 'function' ? await context() : context;
    await this.createExternalCommunicationRoom(room, {
      ...resolvedContext,
      displayName: room.displayName,
      type: room.type,
      avatarUrl: room.avatarUrl,
    });
    return true;
  }

  /**
   * Roll back the Room row saved by `createRoom` when its Matrix room could
   * not be created. Never throws: the original creation error is what the
   * caller must see.
   */
  private async removeRoomAfterFailedExternalCreate(
    room: IRoom,
    creationError: unknown
  ): Promise<void> {
    // Capture ID before removal - TypeORM's remove() clears the entity's id field
    const roomId = room.id;
    this.logger.error(
      {
        message:
          'Unable to create the Matrix room for a new room; removing the room row',
        details: { roomId, roomType: room.type },
      },
      (creationError as Error)?.stack,
      LogContext.COMMUNICATION
    );

    try {
      if (room.authorization) {
        await this.authorizationPolicyService.delete(room.authorization);
      }
      await this.roomRepository.remove(room as Room);
    } catch (cleanupError: unknown) {
      this.logger.error(
        {
          message:
            'Unable to remove the room row after its Matrix room creation failed; the row has no Matrix room until regenerated with adminCommunicationRegenerateMissingRooms',
          details: { roomId, roomType: room.type },
        },
        (cleanupError as Error)?.stack,
        LogContext.COMMUNICATION
      );
    }

    // A transport failure (e.g. RPC timeout) is ambiguous: the adapter may
    // still complete the create after we gave up. Ask it to drop the room so
    // no Matrix room outlives its deleted row. Not awaited - the adapter is
    // likely unresponsive and the caller has already waited one full timeout.
    if (isTransportError(creationError)) {
      void this.deleteExternalRoomBestEffort(roomId);
    }
  }

  private async deleteExternalRoomBestEffort(roomId: string): Promise<void> {
    // The adapter reports a failed delete as `false` rather than throwing.
    let cause: string | undefined;
    let deleted = false;
    try {
      deleted = await this.communicationAdapter.deleteRoom(roomId);
    } catch (error: unknown) {
      cause = (error as Error)?.message;
    }
    if (!deleted) {
      this.logger.warn?.(
        {
          message:
            'Unable to delete the Matrix room of a rolled-back room; if it was created after all it shows up as an orphaned room',
          details: { roomId, cause },
        },
        LogContext.COMMUNICATION
      );
    }
  }

  /**
   * Create a Room with a pre-assigned UUID supplied by the caller.
   *
   * Used by the Element room-check flow (feature 099-element-room-check): the
   * server assigns a UUID at check time, returns it to the matrix-adapter, and
   * Synapse later creates the Matrix room carrying that UUID via the
   * `io.alkemio.pending` state event. The adapter reconciles the Matrix room
   * itself, so this server-side call MUST NOT trigger an outbound
   * `communication.room.create` to the adapter (which would alias-collide or
   * duplicate).
   *
   * Diverges from `createRoom` in two ways:
   *   - The `id` is supplied by the caller (not generated by the DB).
   *   - `createExternalCommunicationRoom` is NOT invoked.
   *
   * See FR-002 in `specs/099-element-room-check/spec.md`.
   */
  async createRoomFromExternal(input: {
    id: string;
    type: RoomType;
  }): Promise<IRoom> {
    const room = new Room('', input.type);
    room.id = input.id;
    room.authorization = new AuthorizationPolicy(AuthorizationPolicyType.ROOM);
    room.messagesCount = 0;
    room.vcInteractionsByThread = {};
    return await this.save(room);
  }

  /**
   * Delegate to RoomLookupService to avoid duplication.
   */
  async getRoomOrFail(
    roomID: string,
    options?: FindOneOptions<Room>
  ): Promise<Room> {
    return this.roomLookupService.getRoomOrFail(roomID, options);
  }

  async deleteRoom(deleteData: DeleteRoomInput): Promise<IRoom> {
    if (!deleteData.roomID) {
      throw new ValidationException(
        'Cannot delete room: roomID is required',
        LogContext.COMMUNICATION
      );
    }

    const room = await this.getRoomOrFail(deleteData.roomID);

    // Capture ID before removal - TypeORM's remove() clears the entity's id field
    const roomId = room.id;

    if (room.authorization) {
      await this.authorizationPolicyService.delete(room.authorization);
    }

    const result = await this.roomRepository.remove(room as Room);

    // Delete from external Matrix server
    // Note: For direct rooms, we still use the standard deleteRoom -
    // the Matrix adapter handles the room type internally
    await this.communicationAdapter.deleteRoom(roomId);
    result.id = roomId;
    return result;
  }

  /**
   * Update the room's display name.
   * Writes to DB immediately and sends RPC to Matrix.
   * The inbound room.updated event will be a no-op (value already matches).
   */
  async updateRoomDisplayName(
    room: IRoom,
    newDisplayName: string
  ): Promise<void> {
    if (room.displayName === newDisplayName) {
      return;
    }

    await this.roomLookupService.updatePartial(room.id, {
      displayName: newDisplayName,
    });
    await this.communicationAdapter.updateRoom(room.id, newDisplayName);
  }

  /**
   * Update the room avatar.
   * Writes to DB immediately (handles clearing via empty string → null)
   * and sends RPC to Matrix. Matrix may not fire a room.updated event
   * when the avatar is cleared, so the local write is essential.
   */
  async updateRoomAvatar(room: IRoom, avatarUrl: string): Promise<void> {
    // Empty string means "remove avatar" — store as null in DB.
    // Must pass null (not undefined) so TypeORM actually sets the column to NULL.
    const dbValue = avatarUrl || null;
    await this.roomLookupService.updatePartial(room.id, {
      avatarUrl: dbValue,
    });
    await this.communicationAdapter.updateRoom(
      room.id,
      undefined, // name
      undefined, // topic
      undefined, // joinRule
      avatarUrl
    );
  }

  async save(room: IRoom): Promise<IRoom> {
    return await this.roomRepository.save(room);
  }

  async getMessages(room: IRoom): Promise<IMessage[]> {
    return this.roomLookupService.getMessages(room);
  }

  /**
   * FIXME: TEMPORARY WORKAROUND - Remove message using sender's identity instead of admin's.
   *
   * Matrix requires moderator/admin privileges to delete other users' messages.
   * Currently, Alkemio users with DELETE privilege on a Room are not reflected as
   * moderators in the Matrix room, so we work around this by:
   *   1. Looking up the original message sender's actorID
   *   2. Deleting the message AS the sender (impersonation)
   *
   * This is a security/audit concern because the deletion appears to come from
   * the message author rather than the admin who actually performed the action.
   *
   * TODO: Implement proper Matrix admin rights reflection so that Alkemio admins
   * are granted moderator power levels in Matrix rooms. Once implemented:
   *   - Use the `actorID` parameter (the actual deleting user) instead of sender
   *   - Remove the `getMessageSenderActor` call
   *   - The `actorID` param is kept in the signature to avoid interface changes later
   *
   * See: docs/matrix-admin-reflection.md for requirements and findings.
   */
  async removeRoomMessage(
    room: IRoom,
    messageData: RoomRemoveMessageInput,
    _agentId: string // TODO: Use this once Matrix admin reflection is implemented
  ): Promise<string> {
    // WORKAROUND: Get the original message sender's actorID - Matrix only allows
    // the sender or room moderators to delete messages. Since we don't yet
    // reflect Alkemio admin rights to Matrix power levels, we impersonate the sender.
    const senderActorID = await this.communicationAdapter.getMessageSenderActor(
      {
        alkemioRoomId: room.id,
        messageId: messageData.messageID,
      }
    );

    if (!senderActorID) {
      throw new ValidationException(
        'Cannot delete message: unable to identify message sender',
        LogContext.COMMUNICATION
      );
    }

    await this.communicationAdapter.deleteMessage({
      actorID: senderActorID, // TODO: Replace with _agentId once Matrix reflection is implemented
      messageId: messageData.messageID,
      roomID: room.id,
    });

    return messageData.messageID;
  }

  private async createExternalCommunicationRoom(
    room: IRoom,
    roomData: CreateRoomInput
  ): Promise<void> {
    const isConversationLegacy = roomData.type === RoomType.CONVERSATION;
    const isDirect = roomData.type === RoomType.CONVERSATION_DIRECT;
    const isGroup = roomData.type === RoomType.CONVERSATION_GROUP;

    // Compute initial members based on room type
    let initialMembers: string[] | undefined;
    if (isDirect) {
      if (!roomData.senderActorID || !roomData.receiverActorID) {
        throw new ValidationException(
          'Missing senderActorID or receiverActorID for direct messaging room creation',
          LogContext.COMMUNICATION_CONVERSATION,
          { roomId: room.id }
        );
      }
      initialMembers = [roomData.senderActorID, roomData.receiverActorID];
    } else if (isGroup && roomData.memberActorIDs) {
      initialMembers = roomData.memberActorIDs;
    } else if (roomData.senderActorID) {
      initialMembers = [roomData.senderActorID];
    }

    const logContext =
      isDirect || isGroup
        ? LogContext.COMMUNICATION_CONVERSATION
        : LogContext.COMMUNICATION;

    this.logger.verbose?.(
      `Creating ${roomData.type} room via Matrix: ${roomData.displayName}`,
      logContext
    );

    // Conversation rooms are visible in Element; all other rooms are hidden
    const isConversation = isConversationLegacy || isDirect || isGroup;
    const customState = {
      'io.alkemio.visibility': { visible: isConversation },
    };

    // Errors propagate: the callers decide what a missing Matrix room means
    // (createRoom rolls the row back, ensureExternalRoom reports the failure).
    await this.communicationAdapter.createRoom(
      room.id,
      roomData.type,
      roomData.displayName, // Empty string = "do not set" (Matrix adapter treats "" as no-op)
      initialMembers,
      roomData.parentContextId,
      roomData.avatarUrl,
      roomData.joinRule,
      roomData.isPublic,
      customState
    );
  }

  async addReactionToMessage(
    room: IRoom,
    actorID: string,
    reactionData: RoomAddReactionToMessageInput
  ): Promise<IMessageReaction> {
    return await this.communicationAdapter.addReaction({
      alkemioRoomId: room.id,
      actorID,
      messageId: reactionData.messageID,
      emoji: reactionData.emoji,
    });
  }

  /**
   * FIXME: TEMPORARY WORKAROUND - Remove reaction using sender's identity instead of admin's.
   *
   * Same issue as removeRoomMessage - Matrix requires appropriate power levels to
   * remove other users' reactions. We work around this by impersonating the reaction sender.
   *
   * Note: Matrix reaction removal semantics may differ from message deletion - needs testing
   * to confirm whether moderators can even remove others' reactions via standard APIs.
   *
   * TODO: Implement proper Matrix admin rights reflection. The `_agentId` param is kept
   * in the signature to avoid interface changes later.
   *
   * See: docs/matrix-admin-reflection.md for requirements and findings.
   */
  async removeReactionToMessage(
    room: IRoom,
    reactionData: RoomRemoveReactionToMessageInput,
    _agentId: string // TODO: Use this once Matrix admin reflection is implemented
  ): Promise<boolean> {
    // WORKAROUND: Get the original reaction sender's actorID and impersonate them
    const senderActorID =
      await this.communicationAdapter.getReactionSenderActor({
        alkemioRoomId: room.id,
        reactionId: reactionData.reactionID,
      });

    if (!senderActorID) {
      throw new ValidationException(
        'Cannot remove reaction: unable to identify reaction sender',
        LogContext.COMMUNICATION
      );
    }

    await this.communicationAdapter.removeReaction({
      alkemioRoomId: room.id,
      actorID: senderActorID, // TODO: Replace with _agentId once Matrix reflection is implemented
      reactionId: reactionData.reactionID,
    });

    return true;
  }

  async getUserIdForMessage(room: IRoom, messageID: string): Promise<string> {
    return this.getUserIdForSender(room, messageID, () =>
      this.communicationAdapter.getMessageSenderActor({
        alkemioRoomId: room.id,
        messageId: messageID,
      })
    );
  }

  async getUserIdForReaction(room: IRoom, reactionID: string): Promise<string> {
    return this.getUserIdForSender(room, reactionID, () =>
      this.communicationAdapter.getReactionSenderActor({
        alkemioRoomId: room.id,
        reactionId: reactionID,
      })
    );
  }

  /**
   * Generic method to resolve user ID from a sender actor.
   * Used by getUserIdForMessage and getUserIdForReaction.
   */
  private async getUserIdForSender(
    room: IRoom,
    entityId: string,
    getSenderActorID: () => Promise<string>
  ): Promise<string> {
    const senderActorID = await getSenderActorID();
    if (senderActorID === '') {
      this.logger.error(
        `Unable to identify sender for ${room.id} - ${entityId}`,
        undefined,
        LogContext.COMMUNICATION
      );
      return '';
    }
    // In the Actor model, actorID IS the userId for user actors
    return senderActorID ?? '';
  }

  /**
   * Mark a message as read for a specific user.
   * Updates read receipts in Matrix.
   */
  async markMessageAsRead(
    room: IRoom,
    actorID: string,
    messageData: RoomMarkMessageReadInput
  ): Promise<boolean> {
    await this.communicationAdapter.markMessageRead(
      actorID,
      room.id,
      messageData.messageID,
      messageData.threadID
    );

    return true;
  }

  /**
   * Get the last message from a room.
   * Useful for displaying conversation previews without fetching all messages.
   */
  async getLastMessage(room: IRoom): Promise<IMessage | null> {
    return this.communicationAdapter.getLastMessage(room.id);
  }

  /**
   * Get unread message counts for a room.
   * Returns room-level unread count and optionally per-thread unread counts.
   *
   * @param room - The room to get unread counts for
   * @param actorID - The agent ID of the requesting user
   * @param threadIds - Optional thread IDs to get per-thread unread counts.
   *   - undefined: only room-level count returned, threadUnreadCounts is null
   *   - empty array or array with IDs: threadUnreadCounts is an array (possibly empty)
   */
  async getUnreadCounts(
    room: IRoom,
    actorID: string,
    threadIds?: string[]
  ): Promise<RoomUnreadCounts> {
    const result = await this.communicationAdapter.getUnreadCounts(
      actorID,
      room.id,
      threadIds
    );

    // Determine threadUnreadCounts based on whether threadIds was provided:
    // - undefined (not provided): return undefined (null in GraphQL) - not requested
    // - provided (including empty array): return array (possibly empty) - requested but no matches
    let threadUnreadCounts:
      | Array<{ threadId: string; count: number }>
      | undefined;
    if (threadIds !== undefined) {
      // threadIds was provided - convert result to array (empty if no matches)
      threadUnreadCounts = result.threadUnreadCounts
        ? Object.entries(result.threadUnreadCounts).map(
            ([threadId, count]) => ({
              threadId,
              count,
            })
          )
        : [];
    }
    // else: threadIds was undefined, leave threadUnreadCounts as undefined (null in GraphQL)

    return {
      roomUnreadCount: result.roomUnreadCount,
      threadUnreadCounts,
    };
  }
}
