import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { LogContext } from '@common/enums';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { IRoom } from '../room/room.interface';
import { IMessage } from '../message/message.interface';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { Room } from '../room/room.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IVcInteraction } from '../vc-interaction/vc.interaction.interface';
import { CreateVcInteractionInput } from '../vc-interaction/dto/vc.interaction.dto.create';
import { RoomSendMessageReplyInput } from '../room/dto/room.dto.send.message.reply';
import { RoomSendMessageInput } from '../room/dto/room.dto.send.message';

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
