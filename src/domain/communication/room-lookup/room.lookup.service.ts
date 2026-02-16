import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { Inject } from '@nestjs/common';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { eq, sql } from 'drizzle-orm';
import { rooms } from '../room/room.schema';
import { IMessage } from '../message/message.interface';
import { RoomSendMessageInput } from '../room/dto/room.dto.send.message';
import { RoomSendMessageReplyInput } from '../room/dto/room.dto.send.message.reply';
import { IRoom } from '../room/room.interface';
import { CreateVcInteractionInput } from '../vc-interaction/dto/vc.interaction.dto.create';
import { IVcInteraction } from '../vc-interaction/vc.interaction.interface';

export class RoomLookupService {
  constructor(
    private readonly communicationAdapter: CommunicationAdapter,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
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

    await this.db
      .update(rooms)
      .set({ vcInteractionsByThread: room.vcInteractionsByThread })
      .where(eq(rooms.id, room.id));

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
    roomID: string
  ): Promise<IRoom> {
    const room = await this.db.query.rooms.findFirst({
      where: eq(rooms.id, roomID),
    });
    if (!room)
      throw new EntityNotFoundException(
        `Not able to locate Room with the specified ID: ${roomID}`,
        LogContext.COMMUNICATION
      );
    return room as unknown as IRoom;
  }

  async save(room: IRoom): Promise<IRoom> {
    const [updated] = await this.db
      .update(rooms)
      .set({
        messagesCount: room.messagesCount,
        type: room.type,
        displayName: room.displayName,
        vcInteractionsByThread: room.vcInteractionsByThread,
      })
      .where(eq(rooms.id, room.id))
      .returning();
    return updated as unknown as IRoom;
  }

  /**
   * Atomically increment the messages count for a room.
   * Uses database-level increment to avoid race conditions.
   */
  async incrementMessagesCount(roomId: string): Promise<void> {
    await this.db
      .update(rooms)
      .set({ messagesCount: sql`${rooms.messagesCount} + 1` })
      .where(eq(rooms.id, roomId));
  }

  /**
   * Atomically decrement the messages count for a room.
   * Uses raw query to ensure count doesn't go below 0.
   */
  async decrementMessagesCount(roomId: string): Promise<void> {
    await this.db
      .update(rooms)
      .set({ messagesCount: sql`GREATEST(${rooms.messagesCount} - 1, 0)` })
      .where(eq(rooms.id, roomId));
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
