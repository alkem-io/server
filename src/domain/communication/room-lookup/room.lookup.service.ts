import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { LogContext } from '@common/enums';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { IRoom } from '../room/room.interface';
import { IMessage } from '../message/message.interface';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';
import { CommunicationRoomResult } from '@services/adapters/communication-adapter/dto/communication.dto.room.result';
import {
  CommunicationRoomWithReadStateResult,
  MessageWithReadState,
} from '@services/adapters/communication-adapter/dto/communication.dto.room.with.read.state.result';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { Room } from '../room/room.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IVcInteraction } from '../vc-interaction/vc.interaction.interface';
import { CreateVcInteractionInput } from '../vc-interaction/dto/vc.interaction.dto.create';
import { RoomSendMessageReplyInput } from '../room/dto/room.dto.send.message.reply';
import { RoomSendMessageInput } from '../room/dto/room.dto.send.message';

interface MessageSender {
  id: string;
  type: 'user' | 'virtualContributor' | 'unknown';
}

export class RoomLookupService {
  constructor(
    private readonly communicationAdapter: CommunicationAdapter,
    private readonly contributorLookupService: ContributorLookupService,
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

    return await this.populateRoomMessageSenders(externalRoom.messages);
  }

  /**
   * Get room content with read state for a specific user.
   * Returns messages with isRead flag and unread count.
   */
  async getRoomAsUser(
    room: IRoom,
    actorId: string
  ): Promise<CommunicationRoomWithReadStateResult> {
    const externalRoom = await this.communicationAdapter.getRoomAsUser(
      room.id,
      actorId
    );

    // Populate sender types for messages
    const messagesWithSenders =
      await this.populateRoomMessageWithReadStateSenders(externalRoom.messages);

    return {
      ...externalRoom,
      messages: messagesWithSenders,
    };
  }

  /**
   * Populate sender types for messages with read state.
   */
  async populateRoomMessageWithReadStateSenders(
    messages: MessageWithReadState[]
  ): Promise<MessageWithReadState[]> {
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

      message.senderType = messageSender.type;
      if (message.reactions) {
        message.reactions = message.reactions.map(r => ({
          ...r,
          senderType: 'user' as const,
        }));
      } else {
        message.reactions = [];
      }
    }

    return messages;
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
