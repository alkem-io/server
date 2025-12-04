import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { LogContext } from '@common/enums';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { IRoom } from '../room/room.interface';
import { IMessage } from '../message/message.interface';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';
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
    private contributorLookupService: ContributorLookupService,
    private vcInteractionService: VcInteractionService,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
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
    const roomResult = await this.communicationAdapter.getRoom(room.id);
    // First message in the thread provides the threadID, but it itself does not have the threadID set
    const threadMessages = roomResult.messages.filter(
      m => m.threadID === threadID || m.id === threadID
    );

    return threadMessages;
  }

  public async getMessageInRoom(
    roomID: string,
    messageID: string
  ): Promise<{ message: IMessage; room: IRoom }> {
    this.logger.verbose?.(
      `Getting message in thread ${messageID} for room ${roomID}`,
      LogContext.COMMUNICATION
    );
    const room = await this.getRoomOrFail(roomID);
    const roomResult = await this.communicationAdapter.getRoom(room.id);
    // First message in the thread provides the threadID, but it itself does not have the threadID set
    const message = roomResult.messages.find(m => m.id === messageID);

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
      const agentId = message.sender;
      let messageSender: MessageSender = { id: agentId, type: 'unknown' };
      try {
        messageSender = await this.updateKnownSendersMap(
          knownSendersMap,
          agentId
        );
      } catch (error) {
        this.logger.warn?.(
          {
            message: 'Unable to identify sender for message.',
            messageId: message.id,
            originalError: error,
          },
          LogContext.COMMUNICATION
        );
      }

      // Keep the agent ID in the sender field - the field resolver will handle the lookup
      // message.sender stays as agentId
      message.senderType = messageSender.type;
      if (message.reactions) {
        // Reactions also keep their agent IDs - field resolvers handle lookup
        message.reactions = message.reactions.map(r => ({
          ...r,
          senderType: 'user' as const, // Will be resolved by field resolver
        }));
      } else {
        message.reactions = [];
      }
    }

    return messages;
  }

  async sendMessage(
    room: IRoom,
    actorId: string,
    messageData: RoomSendMessageInput
  ): Promise<IMessage> {
    // The new adapter uses alkemio room ID and handles membership internally
    const message = await this.communicationAdapter.sendMessage({
      actorId: actorId,
      message: messageData.message,
      roomID: room.id,
    });

    // The message.sender from adapter is already the actorId (agent.id)
    // Keep it as agent ID - the field resolver will handle the lookup

    room.messagesCount = room.messagesCount + 1;
    await this.roomRepository.save(room);
    return message;
  }

  async sendMessageReply(
    room: IRoom,
    actorId: string,
    messageData: RoomSendMessageReplyInput,
    senderType: 'user' | 'virtualContributor'
  ): Promise<IMessage> {
    // The new adapter uses alkemio room ID and handles membership internally
    const message = await this.communicationAdapter.sendMessageReply(
      {
        actorId: actorId,
        message: messageData.message,
        roomID: room.id,
        threadID: messageData.threadID,
      },
      senderType
    );

    // The message.sender from adapter is already the actorId (agent.id)
    // Keep it as agent ID - the field resolver will handle the lookup
    message.senderType = senderType;

    room.messagesCount = room.messagesCount + 1;
    await this.roomRepository.save(room);

    return message;
  }

  /**
   * Identifies and returns the message sender information for a given agent ID.
   *
   * This method first checks if the sender is already known in the provided map. If not found,
   * it attempts to resolve the agent ID to either an Alkemio user or virtual contributor
   * by querying the contributor lookup service. Once identified, the sender information is cached
   * in the known senders map for future lookups.
   *
   * @param knownSendersMap - A map cache containing previously identified message senders
   * @param agentId - The agent ID to identify (agent.id of the contributor)
   * @returns A promise that resolves to the MessageSender object containing the sender's ID and type
   * @throws {Error} When the agent ID cannot be resolved to any known sender type
   */
  private async updateKnownSendersMap(
    knownSendersMap: Map<string, MessageSender>,
    agentId: string
  ): Promise<MessageSender> | never {
    let messageSender = knownSendersMap.get(agentId);
    if (!messageSender) {
      const contributor =
        await this.contributorLookupService.getContributorByAgentId(agentId);
      if (contributor) {
        // Determine if it's a user or virtual contributor by checking the type
        // Users have 'accountID' while VirtualContributors don't at the top level
        // A more reliable check would be to see if it has User-specific properties
        const isUser = 'accountID' in contributor;
        messageSender = {
          id: contributor.id,
          type: isUser ? 'user' : 'virtualContributor',
        };
        knownSendersMap.set(agentId, messageSender);
      }
    }
    if (!messageSender) {
      throw new EntityNotFoundException(
        'Unable to identify sender',
        LogContext.COMMUNICATION,
        { agentId }
      );
    }
    return messageSender;
  }

}
