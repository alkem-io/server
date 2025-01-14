import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { IRoom } from '../room/room.interface';
import { IMessage } from '../message/message.interface';
import { IMessageReaction } from '../message.reaction/message.reaction.interface';
import { IdentityResolverService } from '@services/infrastructure/entity-resolver/identity.resolver.service';
import { CommunicationRoomResult } from '@services/adapters/communication-adapter/dto/communication.dto.room.result';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { Room } from '../room/room.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IVcInteraction } from '../vc-interaction/vc.interaction.interface';
import { VcInteractionService } from '../vc-interaction/vc.interaction.service';
import { CreateVcInteractionInput } from '../vc-interaction/dto/vc.interaction.dto.create';
import { RoomSendMessageReplyInput } from '../room/dto/room.dto.send.message.reply';
import { RoomSendMessageInput } from '../room/dto/room.dto.send.message';

interface MessageSender {
  id: string;
  type: 'user' | 'virtualContributor' | 'unknown';
}

export class RoomLookupService {
  constructor(
    private communicationAdapter: CommunicationAdapter,
    private identityResolverService: IdentityResolverService,
    private vcInteractionService: VcInteractionService,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async getMessagesInThread(
    room: IRoom,
    threadID: string
  ): Promise<IMessage[]> {
    this.logger.verbose?.(
      `Getting messages in thread ${threadID} for room ${room.id}`,
      LogContext.COMMUNICATION
    );
    const roomResult = await this.communicationAdapter.getCommunityRoom(
      room.externalRoomID
    );
    // First message in the thread provides the threadID, but it itself does not have the threadID set
    const threadMessages = roomResult.messages.filter(
      m => m.threadID === threadID || m.id === threadID
    );

    return threadMessages;
  }

  async getMessages(room: IRoom): Promise<IMessage[]> {
    const externalRoom = await this.communicationAdapter.getCommunityRoom(
      room.externalRoomID
    );

    return await this.populateRoomMessageSenders(externalRoom.messages);
  }

  public async addVcInteractionToRoom(
    interactionData: CreateVcInteractionInput
  ): Promise<IVcInteraction> {
    const room = await this.getRoomOrFail(interactionData.roomID, {
      relations: {
        vcInteractions: true,
      },
    });
    if (!room.vcInteractions) {
      throw new EntityNotFoundException(
        `Not able to locate interactions for the room: ${interactionData.roomID}`,
        LogContext.COMMUNICATION
      );
    }

    const interaction =
      this.vcInteractionService.buildVcInteraction(interactionData);
    room.vcInteractions.push(interaction);
    await this.roomRepository.save(room);
    return interaction;
  }

  async getVcInteractions(roomID: string): Promise<IVcInteraction[]> {
    const room = await this.getRoomOrFail(roomID, {
      relations: {
        vcInteractions: {
          room: true,
        },
      },
    });
    if (!room.vcInteractions) {
      throw new EntityNotFoundException(
        `Not able to locate interactions for the room: ${roomID}`,
        LogContext.COMMUNICATION
      );
    }
    return room.vcInteractions;
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

  async populateRoomsMessageSenders(
    rooms: CommunicationRoomResult[]
  ): Promise<CommunicationRoomResult[]> {
    for (const room of rooms) {
      room.messages = await this.populateRoomMessageSenders(room.messages);
    }

    return rooms;
  }

  async populateRoomMessageSenders(messages: IMessage[]): Promise<IMessage[]> {
    const knownSendersMap = new Map<string, MessageSender>();
    for (const message of messages) {
      const matrixUserID = message.sender;
      let messageSender: MessageSender = { id: 'unknown', type: 'unknown' };
      try {
        messageSender = await this.identitySender(
          knownSendersMap,
          matrixUserID
        );
      } catch (error) {
        this.logger.error(
          `Unable to identify sender for message with id ${message.id}`,
          error,
          LogContext.COMMUNICATION
        );
      }

      message.sender = messageSender.id;
      message.senderType = messageSender.type;
      if (message.reactions) {
        message.reactions = await this.populateRoomReactionSenders(
          message.reactions,
          knownSendersMap
        );
      } else {
        message.reactions = [];
      }
    }

    return messages;
  }

  async sendMessage(
    room: IRoom,
    communicationUserID: string,
    messageData: RoomSendMessageInput
  ): Promise<IMessage> {
    // Ensure the user is a member of room and group so can send
    await this.communicationAdapter.addUserToRoom(
      room.externalRoomID,
      communicationUserID
    );
    const alkemioUserID =
      await this.identityResolverService.getUserIDByCommunicationsID(
        communicationUserID
      );
    const message = await this.communicationAdapter.sendMessage({
      senderCommunicationsID: communicationUserID,
      message: messageData.message,
      roomID: room.externalRoomID,
    });

    message.sender = alkemioUserID!;
    room.messagesCount = room.messagesCount + 1;
    await this.roomRepository.save(room);
    return message;
  }

  async sendMessageReply(
    room: IRoom,
    communicationUserID: string,
    messageData: RoomSendMessageReplyInput,
    senderType: 'user' | 'virtualContributor'
  ): Promise<IMessage> {
    // Ensure the user is a member of room and group so can send
    await this.communicationAdapter.addUserToRoom(
      room.externalRoomID,
      communicationUserID
    );

    const alkemioSenderID =
      senderType === 'virtualContributor'
        ? await this.identityResolverService.getContributorIDByCommunicationsID(
            communicationUserID
          )
        : await this.identityResolverService.getUserIDByCommunicationsID(
            communicationUserID
          );
    const message = await this.communicationAdapter.sendMessageReply(
      {
        senderCommunicationsID: communicationUserID,
        message: messageData.message,
        roomID: room.externalRoomID,
        threadID: messageData.threadID,
      },
      senderType
    );

    message.sender = alkemioSenderID!;
    message.senderType = senderType;

    room.messagesCount = room.messagesCount + 1;
    await this.roomRepository.save(room);

    return message;
  }

  private async identitySender(
    knownSendersMap: Map<string, MessageSender>,
    matrixUserID: string
  ): Promise<MessageSender> {
    let messageSender = knownSendersMap.get(matrixUserID);
    if (!messageSender) {
      const alkemioUserID =
        await this.identityResolverService.getUserIDByCommunicationsID(
          matrixUserID
        );
      if (alkemioUserID) {
        messageSender = {
          id: alkemioUserID,
          type: 'user',
        };
      } else {
        const virtualContributorID =
          await this.identityResolverService.getContributorIDByCommunicationsID(
            matrixUserID
          );
        if (virtualContributorID) {
          messageSender = {
            id: virtualContributorID,
            type: 'virtualContributor',
          };
        }
      }
      if (messageSender) {
        knownSendersMap.set(matrixUserID, messageSender);
      }
    }
    if (!messageSender) {
      throw new Error(`Unable to identify sender for ${matrixUserID}`);
    }
    return messageSender;
  }

  async populateRoomReactionSenders(
    reactions: IMessageReaction[],
    knownSendersMap: Map<string, MessageSender>
  ): Promise<IMessageReaction[]> {
    for (const reaction of reactions) {
      const matrixUserID = reaction.sender;
      try {
        const reactionSender = await this.identitySender(
          knownSendersMap,
          matrixUserID
        );

        reaction.sender = reactionSender.id;
      } catch (error) {
        reaction.sender = 'unknown';
      }
    }

    return reactions;
  }
}
