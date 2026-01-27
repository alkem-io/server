import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { IMessage } from '../message/message.interface';
import { RoomSendMessageInput } from '../room/dto/room.dto.send.message';
import { RoomSendMessageReplyInput } from '../room/dto/room.dto.send.message.reply';
import { Room } from '../room/room.entity';
import { IRoom } from '../room/room.interface';
import { CreateVcInteractionInput } from '../vc-interaction/dto/vc.interaction.dto.create';
import { IVcInteraction } from '../vc-interaction/vc.interaction.interface';

export class RoomLookupService {
  constructor(
    private readonly communicationAdapter: CommunicationAdapter,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger
  ) {}

  async getMessagesInThread(
    room: IRoom,
    threadID: string
  ): Promise<IMessage[]> {
    this.logger.verbose?.(
      `Getting messages in thread ${threadID} for room ${room.id}`,
      LogContext.COMMUNICATION
    );
    // Use getThreadMessages for efficient thread-only lookup (no full room fetch)
    return this.communicationAdapter.getThreadMessages(room.id, threadID);
  }

  public async getMessageInRoom(
    roomID: string,
    messageID: string
  ): Promise<{ message: IMessage; room: IRoom }> {
    this.logger.verbose?.(
      `Getting message ${messageID} in room ${roomID}`,
      LogContext.COMMUNICATION
    );
    const room = await this.getRoomOrFail(roomID);

    // Use getMessage() for efficient single-message lookup instead of fetching entire room
    const message = await this.communicationAdapter.getMessage({
      alkemioRoomId: room.id,
      messageId: messageID,
    });

    if (!message) {
      throw new EntityNotFoundException(
        `Not able to locate Message with the specified ID: ${messageID}`,
        LogContext.COMMUNICATION
      );
    }

    return { message, room };
  }

  async getMessages(room: IRoom): Promise<IMessage[]> {
    const externalRoom = await this.communicationAdapter.getRoom(room.id);
    return externalRoom.messages;
  }

  public async addVcInteractionToRoom(
    interactionData: CreateVcInteractionInput
  ): Promise<IVcInteraction> {
    const room = await this.getRoomOrFail(interactionData.roomID);

    // Add to JSON map
    if (!room.vcInteractionsByThread) {
      room.vcInteractionsByThread = {};
    }

    room.vcInteractionsByThread[interactionData.threadID] = {
      virtualContributorActorID: interactionData.virtualContributorActorID,
    };

    await this.roomRepository.save(room);

    return {
      threadID: interactionData.threadID,
      virtualContributorID: interactionData.virtualContributorActorID,
    };
  }

  async getVcInteractions(roomID: string): Promise<IVcInteraction[]> {
    const room = await this.getRoomOrFail(roomID);

    const vcInteractionsByThread = room.vcInteractionsByThread || {};
    return Object.entries(vcInteractionsByThread).map(([threadID, data]) => ({
      threadID,
      virtualContributorID: data.virtualContributorActorID,
    }));
  }

  async getRoomOrFail(
    roomID: string,
    options?: FindOneOptions<Room>
  ): Promise<Room> {
    const room = await this.roomRepository.findOne({
      where: { id: roomID },
      ...options,
    });
    if (!room)
      throw new EntityNotFoundException(
        `Not able to locate Room with the specified ID: ${roomID}`,
        LogContext.COMMUNICATION
      );
    return room;
  }

  async save(room: IRoom): Promise<IRoom> {
    return await this.roomRepository.save(room as Room);
  }

  /**
   * Atomically increment the messages count for a room.
   * Uses database-level increment to avoid race conditions.
   */
  async incrementMessagesCount(roomId: string): Promise<void> {
    await this.roomRepository.increment({ id: roomId }, 'messagesCount', 1);
  }

  /**
   * Atomically decrement the messages count for a room.
   * Uses raw query to ensure count doesn't go below 0.
   */
  async decrementMessagesCount(roomId: string): Promise<void> {
    await this.roomRepository
      .createQueryBuilder()
      .update()
      .set({ messagesCount: () => 'GREATEST("messagesCount" - 1, 0)' })
      .where('id = :id', { id: roomId })
      .execute();
  }

  async sendMessage(
    room: IRoom,
    actorId: string,
    messageData: RoomSendMessageInput
  ): Promise<IMessage> {
    // The new adapter uses alkemio room ID and handles membership internally
    return this.communicationAdapter.sendMessage({
      actorId: actorId,
      message: messageData.message,
      roomID: room.id,
    });
  }

  async sendMessageReply(
    room: IRoom,
    actorId: string,
    messageData: RoomSendMessageReplyInput
  ): Promise<IMessage> {
    // The new adapter uses alkemio room ID and handles membership internally
    return this.communicationAdapter.sendMessageReply({
      actorId: actorId,
      message: messageData.message,
      roomID: room.id,
      threadID: messageData.threadID,
    });
  }
}
