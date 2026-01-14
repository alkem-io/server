import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Room } from './room.entity';
import { IRoom } from './room.interface';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { IMessage } from '../message/message.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RoomType } from '@common/enums/room.type';
import { IMessageReaction } from '../message.reaction/message.reaction.interface';
import { RoomAddReactionToMessageInput } from './dto/room.dto.add.reaction.to.message';
import { RoomRemoveReactionToMessageInput } from './dto/room.dto.remove.message.reaction';
import { RoomRemoveMessageInput } from './dto/room.dto.remove.message';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import { CreateRoomInput } from './dto/room.dto.create';
import { DeleteRoomInput } from './dto/room.dto.delete';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';

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
    const room = await this.getRoomOrFail(deleteData.roomID);

    const result = await this.roomRepository.remove(room as Room);

    // Delete from external Matrix server
    // Note: For direct rooms, we still use the standard deleteRoom -
    // the Matrix adapter handles the room type internally
    await this.communicationAdapter.deleteRoom(room.id);
    result.id = room.id;
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
    const messages = await this.roomLookupService.getMessages(room);

    const messagesCount = messages.length;
    if (messagesCount != room.messagesCount) {
      this.logger.warn(
        `Room (${room.id}) had a comment count of ${room.messagesCount} that is not synced with the messages count of ${messagesCount}`,
        LogContext.COMMUNICATION
      );
      room.messagesCount = messagesCount;
      await this.save(room);
    }
    return messages;
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

    await this.communicationAdapter.deleteMessage({
      actorId: senderActorId, // TODO: Replace with _agentId once Matrix reflection is implemented
      messageId: messageData.messageID,
      roomID: room.id,
    });
    room.messagesCount = room.messagesCount - 1;
    await this.save(room);
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
    const reaction = await this.communicationAdapter.addReaction({
      alkemioRoomId: room.id,
      actorId,
      messageId: reactionData.messageID,
      emoji: reactionData.emoji,
    });

    return reaction;
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

    await this.communicationAdapter.removeReaction({
      alkemioRoomId: room.id,
      actorId: senderActorId, // TODO: Replace with _agentId once Matrix reflection is implemented
      reactionId: reactionData.reactionID,
    });

    return true;
  }

  async getUserIdForMessage(room: IRoom, messageID: string): Promise<string> {
    const senderActorId = await this.communicationAdapter.getMessageSenderActor(
      {
        alkemioRoomId: room.id,
        messageId: messageID,
      }
    );
    if (senderActorId === '') {
      this.logger.error(
        `Unable to identify sender for ${room.id} - ${messageID}`,
        undefined,
        LogContext.COMMUNICATION
      );
      return '';
    }
    const userId =
      await this.contributorLookupService.getUserIdByAgentId(senderActorId);

    return userId ?? '';
  }

  async getUserIdForReaction(room: IRoom, reactionID: string): Promise<string> {
    const senderActorId =
      await this.communicationAdapter.getReactionSenderActor({
        alkemioRoomId: room.id,
        reactionId: reactionID,
      });
    if (senderActorId === '') {
      this.logger.error(
        `Unable to identify sender for ${room.id} - ${reactionID}`,
        undefined,
        LogContext.COMMUNICATION
      );
      return '';
    }
    const userId =
      await this.contributorLookupService.getUserIdByAgentId(senderActorId);

    return userId ?? '';
  }
}
