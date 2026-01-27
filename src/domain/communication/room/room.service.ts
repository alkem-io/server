import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { RoomType } from '@common/enums/room.type';
import { ValidationException } from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';
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

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    private readonly communicationAdapter: CommunicationAdapter,
    private readonly roomLookupService: RoomLookupService,
    private readonly contributorLookupService: ContributorLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createRoom(roomData: CreateRoomInput): Promise<IRoom> {
    const room = new Room(roomData.displayName, roomData.type);
    room.authorization = new AuthorizationPolicy(AuthorizationPolicyType.ROOM);
    room.messagesCount = 0;
    room.vcInteractionsByThread = {};

    // Save first to get the ID assigned by the database
    const savedRoom = await this.save(room);

    // Now create the external room with the assigned ID
    await this.createExternalCommunicationRoom(savedRoom, roomData);
    return savedRoom;
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

    const result = await this.roomRepository.remove(room as Room);

    // Delete from external Matrix server
    // Note: For direct rooms, we still use the standard deleteRoom -
    // the Matrix adapter handles the room type internally
    await this.communicationAdapter.deleteRoom(roomId);
    result.id = roomId;
    return result;
  }

  /**
   * Update the room's display name in both the local database and Matrix.
   * Call this when the parent entity's displayName changes.
   */
  async updateRoomDisplayName(
    room: IRoom,
    newDisplayName: string
  ): Promise<IRoom> {
    if (room.displayName === newDisplayName) {
      return room;
    }

    room.displayName = newDisplayName;
    await this.communicationAdapter.updateRoom(room.id, newDisplayName);

    return this.save(room);
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
   *   1. Looking up the original message sender's actorId
   *   2. Deleting the message AS the sender (impersonation)
   *
   * This is a security/audit concern because the deletion appears to come from
   * the message author rather than the admin who actually performed the action.
   *
   * TODO: Implement proper Matrix admin rights reflection so that Alkemio admins
   * are granted moderator power levels in Matrix rooms. Once implemented:
   *   - Use the `agentId` parameter (the actual deleting user) instead of sender
   *   - Remove the `getMessageSenderActor` call
   *   - The `agentId` param is kept in the signature to avoid interface changes later
   *
   * See: docs/matrix-admin-reflection.md for requirements and findings.
   */
  async removeRoomMessage(
    room: IRoom,
    messageData: RoomRemoveMessageInput,
    _agentId: string // TODO: Use this once Matrix admin reflection is implemented
  ): Promise<string> {
    // WORKAROUND: Get the original message sender's actorId - Matrix only allows
    // the sender or room moderators to delete messages. Since we don't yet
    // reflect Alkemio admin rights to Matrix power levels, we impersonate the sender.
    const senderActorId = await this.communicationAdapter.getMessageSenderActor(
      {
        alkemioRoomId: room.id,
        messageId: messageData.messageID,
      }
    );

    if (!senderActorId) {
      throw new ValidationException(
        'Cannot delete message: unable to identify message sender',
        LogContext.COMMUNICATION
      );
    }

    await this.communicationAdapter.deleteMessage({
      actorId: senderActorId, // TODO: Replace with _agentId once Matrix reflection is implemented
      messageId: messageData.messageID,
      roomID: room.id,
    });

    return messageData.messageID;
  }

  private async createExternalCommunicationRoom(
    room: IRoom,
    roomData: CreateRoomInput
  ): Promise<void> {
    const isDirect = roomData.type === RoomType.CONVERSATION_DIRECT;

    // Compute initial members based on room type
    let initialMembers: string[] | undefined;
    if (isDirect) {
      if (!roomData.senderActorId || !roomData.receiverActorId) {
        throw new Error(
          `Missing senderActorId or receiverActorId for direct messaging room creation: ${roomData.displayName}`
        );
      }
      initialMembers = [roomData.senderActorId, roomData.receiverActorId];
    } else if (roomData.senderActorId) {
      initialMembers = [roomData.senderActorId];
    }

    const logContext = isDirect
      ? LogContext.COMMUNICATION_CONVERSATION
      : LogContext.COMMUNICATION;

    try {
      this.logger.verbose?.(
        `Creating ${isDirect ? 'direct message' : 'group message'} room via Matrix: ${roomData.displayName}`,
        logContext
      );

      await this.communicationAdapter.createRoom(
        room.id,
        roomData.type,
        roomData.displayName,
        initialMembers
      );
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Unable to initialize communication room (${roomData.displayName})`,
        err.stack,
        LogContext.COMMUNICATION
      );
    }
  }

  async addReactionToMessage(
    room: IRoom,
    actorId: string,
    reactionData: RoomAddReactionToMessageInput
  ): Promise<IMessageReaction> {
    return await this.communicationAdapter.addReaction({
      alkemioRoomId: room.id,
      actorId,
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
    // WORKAROUND: Get the original reaction sender's actorId and impersonate them
    const senderActorId =
      await this.communicationAdapter.getReactionSenderActor({
        alkemioRoomId: room.id,
        reactionId: reactionData.reactionID,
      });

    if (!senderActorId) {
      throw new ValidationException(
        'Cannot remove reaction: unable to identify reaction sender',
        LogContext.COMMUNICATION
      );
    }

    await this.communicationAdapter.removeReaction({
      alkemioRoomId: room.id,
      actorId: senderActorId, // TODO: Replace with _agentId once Matrix reflection is implemented
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
    getSenderActorId: () => Promise<string>
  ): Promise<string> {
    const senderActorId = await getSenderActorId();
    if (senderActorId === '') {
      this.logger.error(
        `Unable to identify sender for ${room.id} - ${entityId}`,
        undefined,
        LogContext.COMMUNICATION
      );
      return '';
    }
    const userId =
      await this.contributorLookupService.getUserIdByAgentId(senderActorId);

    return userId ?? '';
  }

  /**
   * Mark a message as read for a specific user.
   * Updates read receipts in Matrix.
   */
  async markMessageAsRead(
    room: IRoom,
    agentId: string,
    messageData: RoomMarkMessageReadInput
  ): Promise<boolean> {
    await this.communicationAdapter.markMessageRead(
      agentId,
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
   * @param agentId - The agent ID of the requesting user
   * @param threadIds - Optional thread IDs to get per-thread unread counts.
   *   - undefined: only room-level count returned, threadUnreadCounts is null
   *   - empty array or array with IDs: threadUnreadCounts is an array (possibly empty)
   */
  async getUnreadCounts(
    room: IRoom,
    agentId: string,
    threadIds?: string[]
  ): Promise<RoomUnreadCounts> {
    const result = await this.communicationAdapter.getUnreadCounts(
      agentId,
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
