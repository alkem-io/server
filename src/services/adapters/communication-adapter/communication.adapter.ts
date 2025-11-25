import { firstValueFrom, TimeoutError, Observable } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';
import { LogContext } from '@common/enums';
import { MatrixEntityNotFoundException } from '@common/exceptions';
import { DirectRoomResult } from '@domain/communication/communication/dto/communication.dto.send.direct.message.user.result';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CommunicationDeleteMessageInput } from './dto/communication.dto.message.delete';
import { CommunicationSendMessageUserInput } from './dto/communication.dto.message.send.user';
import { IMessage } from '@domain/communication/message/message.interface';
import { MATRIX_ADAPTER_SERVICE } from '@common/constants';
import { ClientProxy } from '@nestjs/microservices';
import {
  AdminAllRoomsPayload,
  AdminReplicateRoomMembershipPayload,
  AdminReplicateRoomMembershipResponsePayload,
  MatrixAdapterEventType,
  RoomCreatePayload,
  RoomCreateResponsePayload,
  RoomDeletePayload,
  RoomDeleteResponsePayload,
  RoomMessageAddReactionPayload,
  RoomMessageAddReactionResponsePayload,
  RoomMessageDeletePayload,
  RoomMessageDeleteResponsePayload,
  RoomMessageDetailsPayload,
  RoomMessageReactionSenderPayload,
  RoomMessageReactionSenderResponsePayload,
  RoomMessageRemoveReactionPayload,
  RoomMessageSendPayload,
  RoomMessageSendReplyPayload,
  RoomMessageSendResponsePayload,
  RoomUpdateStatePayload,
  ActorAddToRoomsPayload,
  ActorAddToRoomsResponsePayload,
  ActorRegisterPayload,
  ActorRegisterResponsePayload,
  ActorRemoveFromRoomsPayload,
  ActorRemoveFromRoomsResponsePayload,
  ActorRoomsDirectPayload,
  ActorRoomsPayload,
  ActorRoomsResponsePayload,
  ActorStartDirectMessagingPayload,
  ActorStartDirectMessagingResponsePayload,
} from '@alkemio/matrix-adapter-lib';
import { RoomDetailsPayload } from '@alkemio/matrix-adapter-lib';
import { RoomDetailsResponsePayload } from '@alkemio/matrix-adapter-lib';
import { CommunicationSendMessageInput } from './dto/communication.dto.message.send';
import { RoomMessageSenderResponsePayload } from '@alkemio/matrix-adapter-lib';
import { RoomMessageSenderPayload } from '@alkemio/matrix-adapter-lib';
import { RoomMembersPayload } from '@alkemio/matrix-adapter-lib';
import { RoomMembersResponsePayload } from '@alkemio/matrix-adapter-lib';
import { BaseMatrixAdapterEventPayload } from '@alkemio/matrix-adapter-lib';
import { BaseMatrixAdapterEventResponsePayload } from '@alkemio/matrix-adapter-lib/dist/dto/base.event.response.payload';
import { getRandomId } from '@common/utils/random.id.generator.util';
import { stringifyWithoutAuthorizationMetaInfo } from '@common/utils/stringify.util';
import { CommunicationTimedOutException } from '@common/exceptions/communication';
import { CommunicationSendMessageReplyInput } from './dto/communications.dto.message.reply';
import { CommunicationAddReactionToMessageInput } from './dto/communication.dto.add.reaction';
import { CommunicationRoomResult } from '@services/adapters/communication-adapter/dto/communication.dto.room.result';
import { IMessageReaction } from '@domain/communication/message.reaction/message.reaction.interface';
import { RoomResult } from '@alkemio/matrix-adapter-lib/dist/types/room';
import { AlkemioConfig } from '@src/types';
import { CommunicationRemoveReactionToMessageInput } from './dto/communication.dto.remove.reaction';

@Injectable()
export class CommunicationAdapter {
  private readonly enabled = false;
  private readonly timeout: number;
  private readonly retries: number;
  public directMessageRoomsEnabled: boolean;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(MATRIX_ADAPTER_SERVICE) private matrixAdapterClient: ClientProxy
  ) {
    const communications = this.configService.get('communications');
    this.enabled = communications?.enabled;
    this.timeout = +communications?.matrix?.connection_timeout * 1000;
    this.retries = +communications?.matrix?.connection_retries;
    this.directMessageRoomsEnabled =
      communications?.direct_message_rooms?.enabled;
  }

  async sendMessageToRoom(
    sendMessageData: CommunicationSendMessageInput
  ): Promise<IMessage> {
    if (!this.enabled) {
      throw new MatrixEntityNotFoundException(
        'Communications are disabled',
        LogContext.COMMUNICATION
      );
    }
    const eventType = MatrixAdapterEventType.ROOM_MESSAGE_SEND;
    const inputPayload: RoomMessageSendPayload = {
      triggeredBy: sendMessageData.agentID,
      roomID: sendMessageData.roomID,
      message: sendMessageData.message,
      senderActorID: sendMessageData.agentID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);

    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomMessageSendResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);

      const message = responseData.message;
      this.logger.verbose?.(
        `...message sent to room: ${sendMessageData.roomID}`,
        LogContext.COMMUNICATION
      );
      return {
        ...message,
        senderType: 'user',
        reactions: message.reactions.map(reaction => {
          return {
            ...reaction,
            senderType: 'user',
          };
        }),
      };
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to send message to room: ${err?.message ?? err}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async sendRoomMessageReply(
    sendMessageData: CommunicationSendMessageReplyInput,
    senderType: 'user' | 'virtualContributor'
  ): Promise<IMessage> {
    if (!this.enabled) {
      throw new MatrixEntityNotFoundException(
        'Communications are disabled',
        LogContext.COMMUNICATION
      );
    }
    const eventType = MatrixAdapterEventType.ROOM_MESSAGE_SEND_REPLY;
    const inputPayload: RoomMessageSendReplyPayload = {
      triggeredBy: '',
      roomID: sendMessageData.roomID,
      message: sendMessageData.message,
      senderActorID: sendMessageData.agentID,
      threadID: sendMessageData.threadID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);

    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomMessageSendResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);

      const message = responseData.message;
      this.logger.verbose?.(
        `...message sent to room: ${sendMessageData.roomID}`,
        LogContext.COMMUNICATION
      );
      return {
        ...message,
        senderType,
        reactions: message.reactions.map(reaction => {
          return {
            ...reaction,
            senderType: 'user',
          };
        }),
      };
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to send message to room: ${err?.message ?? err}`,
        LogContext.COMMUNICATION
      );
    }
  }

  public async sendMessageToUser(
    sendMessageUserData: CommunicationSendMessageUserInput
  ): Promise<IMessage> {
    if (!this.enabled) {
      throw new MatrixEntityNotFoundException(
        'Communications are disabled',
        LogContext.COMMUNICATION
      );
    }
    const eventType = MatrixAdapterEventType.ACTOR_START_DIRECT_MESSAGING;
    const inputPayload: ActorStartDirectMessagingPayload = {
      triggeredBy: '',
      receiverActorID: sendMessageUserData.receiverAgentID,
      initiatingActorID: sendMessageUserData.initiatingAgentID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);

    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<ActorStartDirectMessagingResponsePayload>(
          response
        );
      this.logResponsePayload(eventType, responseData, eventID);

      if (!responseData.success || !responseData.roomID) {
        throw new Error('Failed to start direct messaging');
      }

      return this.sendMessageToRoom({
        roomID: responseData.roomID,
        message: sendMessageUserData.message,
        agentID: sendMessageUserData.initiatingAgentID,
      });
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to send message to user: ${err}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async addReaction(
    sendMessageData: CommunicationAddReactionToMessageInput
  ): Promise<IMessageReaction> {
    if (!this.enabled) {
      throw new MatrixEntityNotFoundException(
        'Communications are disabled',
        LogContext.COMMUNICATION
      );
    }
    const eventType = MatrixAdapterEventType.ROOM_MESSAGE_ADD_REACTION;
    const inputPayload: RoomMessageAddReactionPayload = {
      triggeredBy: '',
      roomID: sendMessageData.roomID,
      emoji: sendMessageData.emoji,
      senderActorID: sendMessageData.agentID,
      messageID: sendMessageData.messageID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);

    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomMessageAddReactionResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);

      const reaction = responseData.reaction;
      this.logger.verbose?.(
        `...reaction added to message in room: ${sendMessageData.roomID}`,
        LogContext.COMMUNICATION
      );
      return {
        ...reaction,
        senderType: 'user', // TODO compute actual senderType
      };
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to add reaction to message in room: ${err?.message ?? err}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async removeReaction(
    removeReactionData: CommunicationRemoveReactionToMessageInput
  ): Promise<string> {
    if (!this.enabled) {
      throw new MatrixEntityNotFoundException(
        'Communications are disabled',
        LogContext.COMMUNICATION
      );
    }
    const eventType = MatrixAdapterEventType.ROOM_MESSAGE_REMOVE_REACTION;
    const inputPayload: RoomMessageRemoveReactionPayload = {
      triggeredBy: removeReactionData.agentID,
      roomID: removeReactionData.roomID,
      reactionID: removeReactionData.reactionID,
      senderActorID: removeReactionData.agentID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);

    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomMessageDeleteResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.messageID;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to remove reaction from room: ${err?.message ?? err}`,
        LogContext.COMMUNICATION
      );
    }
  }

  public async getRoomMessage(
    roomID: string,
    messageID: string
  ): Promise<CommunicationRoomResult> {
    const eventType = MatrixAdapterEventType.ROOM_MESSAGE_DETAILS;
    // If not enabled just return an empty room
    if (!this.enabled) {
      return {
        id: 'communications-not-enabled',
        messages: [],
        displayName: '',
        members: [],
      };
    }

    const inputPayload: RoomMessageDetailsPayload = {
      triggeredBy: '',
      roomID: roomID,
      messageIDs: [messageID],
    };
    const eventID = this.logInputPayload(eventType, inputPayload);

    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomDetailsResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return this.convertRoomDetailsResponseToCommunicationRoomResult(
        responseData
      );
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to obtain room message details: ${err?.message ?? err}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async getCommunityRoom(roomId: string): Promise<CommunicationRoomResult> {
    const eventType = MatrixAdapterEventType.ROOM_DETAILS;
    // If not enabled just return an empty room
    if (!this.enabled) {
      return {
        id: 'communications-not-enabled',
        messages: [],
        displayName: '',
        members: [],
      };
    }

    const inputPayload: RoomDetailsPayload = {
      triggeredBy: '',
      roomID: roomId,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);

    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomDetailsResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return this.convertRoomDetailsResponseToCommunicationRoomResult(
        responseData
      );
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to obtain room: ${err?.message ?? err}`,
        LogContext.COMMUNICATION
      );
    }
  }

  private convertRoomDetailsResponseToCommunicationRoomResult(
    roomDetailsResponse: RoomDetailsResponsePayload
  ): CommunicationRoomResult {
    return {
      ...roomDetailsResponse.room,
      messages: roomDetailsResponse.room.messages.map(message => {
        return {
          ...message,
          senderType: 'user',
          reactions: message.reactions.map(reaction => {
            return {
              ...reaction,
              senderType: 'user',
            };
          }),
        };
      }),
    };
  }

  async deleteMessage(
    deleteMessageData: CommunicationDeleteMessageInput
  ): Promise<string> {
    if (!this.enabled) {
      throw new MatrixEntityNotFoundException(
        'Communications are disabled',
        LogContext.COMMUNICATION
      );
    }
    const eventType = MatrixAdapterEventType.ROOM_MESSAGE_DELETE;
    const inputPayload: RoomMessageDeletePayload = {
      triggeredBy: deleteMessageData.agentID,
      roomID: deleteMessageData.roomID,
      messageID: deleteMessageData.messageId,
      senderActorID: deleteMessageData.agentID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);

    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomMessageDeleteResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.messageID;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        'Failed to delete message from room',
        LogContext.COMMUNICATION
      );
    }
  }

  async getMessageSender(roomID: string, messageID: string): Promise<string> {
    if (!this.enabled) {
      throw new MatrixEntityNotFoundException(
        'Communications are disabled',
        LogContext.COMMUNICATION
      );
    }
    const eventType = MatrixAdapterEventType.ROOM_MESSAGE_SENDER;
    const inputPayload: RoomMessageSenderPayload = {
      triggeredBy: '',
      roomID: roomID,
      messageID: messageID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomMessageSenderResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.senderActorID;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Unable to locate message (id: ${messageID}) in room: ${roomID}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async getReactionSender(roomID: string, reactionID: string): Promise<string> {
    if (!this.enabled) {
      throw new MatrixEntityNotFoundException(
        'Communications are disabled',
        LogContext.COMMUNICATION
      );
    }
    const eventType = MatrixAdapterEventType.ROOM_MESSAGE_REACTION_SENDER;
    const inputPayload: RoomMessageReactionSenderPayload = {
      triggeredBy: '',
      roomID: roomID,
      reactionID: reactionID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomMessageReactionSenderResponsePayload>(
          response
        );
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.senderActorID;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Unable to locate message (id: ${reactionID}) in room: ${roomID}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async tryRegisterNewUser(actorID: string): Promise<string | undefined> {
    if (!this.enabled) {
      return undefined;
    }
    const eventType = MatrixAdapterEventType.ACTOR_REGISTER;
    const inputPayload: ActorRegisterPayload = {
      triggeredBy: '',
      actorID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<ActorRegisterResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return actorID;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      this.logger.verbose?.(
        `Attempt to register user failed: ${err}; user registration for Communication to be re-tried later`,
        LogContext.COMMUNICATION
      );
    }
  }

  async createCommunityRoom(
    name: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    // If not enabled just return an empty string
    if (!this.enabled) {
      return '';
    }
    const eventType = MatrixAdapterEventType.ROOM_CREATE;
    const inputPayload: RoomCreatePayload = {
      triggeredBy: '',
      roomName: name,
      metadata: metadata,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomCreateResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      this.logger.verbose?.(
        `Created community room:'${responseData.roomID}'`,
        LogContext.COMMUNICATION
      );
      return responseData.roomID;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to create room: ${err}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async userAddToRooms(roomIDs: string[], agentID: string): Promise<boolean> {
    // If not enabled just return
    if (!this.enabled) {
      return false;
    }
    const eventType = MatrixAdapterEventType.ACTOR_ADD_TO_ROOMS;
    const inputPayload: ActorAddToRoomsPayload = {
      triggeredBy: '',
      roomIDs,
      actorID: agentID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<ActorAddToRoomsResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.success;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      this.logger.warn?.(
        `Unable to add user (${agentID}) to rooms (${roomIDs}): already added?: ${err}`,
        LogContext.COMMUNICATION
      );
      return false;
    }
  }

  async getCommunityRooms(agentID: string): Promise<CommunicationRoomResult[]> {
    const rooms: CommunicationRoomResult[] = [];
    // If not enabled just return an empty array
    if (!this.enabled) {
      return rooms;
    }
    const eventType = MatrixAdapterEventType.ACTOR_ROOMS;
    const inputPayload: ActorRoomsPayload = {
      triggeredBy: '',
      actorID: agentID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<ActorRoomsResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.rooms.map((room: any) => {
        return {
          ...room,
          messages: (room.messages || []).map((message: any) => {
            return {
              ...message,
              senderType: 'user',
              reactions: message.reactions.map((reaction: any) => {
                return {
                  ...reaction,
                  senderType: 'user',
                };
              }),
            };
          }),
        };
      });
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to get rooms for User: ${err}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async userGetDirectRooms(agentID: string): Promise<DirectRoomResult[]> {
    const rooms: DirectRoomResult[] = [];
    // If not enabled just return an empty array
    if (!this.enabled) {
      return rooms;
    }
    const eventType = MatrixAdapterEventType.ACTOR_ROOMS_DIRECT;
    const inputPayload: ActorRoomsDirectPayload = {
      triggeredBy: '',
      actorID: agentID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<ActorRoomsResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.rooms.map((room: any) => {
        return {
          ...room,
          messages: room.messages.map((message: any) => {
            return {
              ...message,
              senderType: 'user',
              reactions: message.reactions.map((reaction: any) => {
                return {
                  ...reaction,
                  senderType: 'user',
                };
              }),
            };
          }),
        };
      });
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to get direct rooms for User: ${err}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async removeUserFromRooms(
    roomIDs: string[],
    agentID: string
  ): Promise<boolean> {
    // If not enabled just return
    if (!this.enabled) {
      return false;
    }
    const eventType = MatrixAdapterEventType.ACTOR_REMOVE_FROM_ROOMS;
    this.logger.verbose?.(
      `Removing user (${agentID}) from rooms (${roomIDs})`,
      LogContext.COMMUNICATION
    );
    const inputPayload: ActorRemoveFromRoomsPayload = {
      triggeredBy: '',
      actorID: agentID,
      roomIDs,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<ActorRemoveFromRoomsResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.success;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to remove user from rooms: ${err}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async adminGetAllRooms(): Promise<RoomResult[]> {
    if (!this.enabled) {
      return [];
    }
    const inputPayload: AdminAllRoomsPayload = {
      triggeredBy: '',
    };
    const eventType = MatrixAdapterEventType.ADMIN_ALL_ROOMS;
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<ActorRoomsResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.rooms;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to get all rooms: ${err}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async adminReplicateRoomMembership(
    targetRoomID: string,
    sourceRoomID: string,
    userToPrioritize: string
  ): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }
    this.logger.verbose?.(
      `[Replication] Replicating room membership from ${sourceRoomID} to ${targetRoomID}`,
      LogContext.COMMUNICATION
    );
    const eventType = MatrixAdapterEventType.ADMIN_REPLICATE_ROOM_MEMBERSHIP;
    const inputPayload: AdminReplicateRoomMembershipPayload = {
      triggeredBy: '',
      targetRoomID,
      sourceRoomID,
      actorToPrioritize: userToPrioritize,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<AdminReplicateRoomMembershipResponsePayload>(
          response
        );
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.success;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to replicate room membership: ${err}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async removeRoom(matrixRoomID: string) {
    if (!this.enabled) {
      return false;
    }
    this.logger.verbose?.(
      `[Membership] Removing members from matrix room: ${matrixRoomID}`,
      LogContext.COMMUNICATION
    );
    const eventType = MatrixAdapterEventType.ROOM_DELETE;
    const inputPayload: RoomDeletePayload = {
      triggeredBy: '',
      roomID: matrixRoomID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomDeleteResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      this.logger.verbose?.(
        `[Membership] Removed members from room: ${matrixRoomID}`,
        LogContext.COMMUNICATION
      );
      return responseData.success;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      this.logger.verbose?.(
        `Unable to remove room  (${matrixRoomID}): ${err}`,
        LogContext.COMMUNICATION
      );
      return false;
    }
  }

  async getRoomMembers(matrixRoomID: string): Promise<string[]> {
    if (!this.enabled) {
      return [];
    }
    let userIDs: string[] = [];
    this.logger.verbose?.(
      `Getting members of matrix room: ${matrixRoomID}`,
      LogContext.COMMUNICATION
    );
    const eventType = MatrixAdapterEventType.ROOM_MEMBERS;
    const inputPayload: RoomMembersPayload = {
      triggeredBy: '',
      roomID: matrixRoomID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomMembersResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      userIDs = responseData.actorIDs;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      this.logger.verbose?.(
        `Unable to get room members  (${matrixRoomID}): ${err}`,
        LogContext.COMMUNICATION
      );
      throw err;
    }

    return userIDs;
  }

  async updateMatrixRoomState(
    roomID: string,
    worldVisible = true,
    allowGuests = true
  ): Promise<CommunicationRoomResult> {
    if (!this.enabled) {
      return {
        id: 'communications-not-enabled',
        messages: [],
        displayName: '',
        members: [],
      };
    }
    const eventType = MatrixAdapterEventType.ROOM_UPDATE_STATE;
    const inputPayload: RoomUpdateStatePayload = {
      triggeredBy: '',
      roomID,
      historyWorldVisible: worldVisible,
      allowJoining: allowGuests,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomDetailsResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return this.convertRoomDetailsResponseToCommunicationRoomResult(
        responseData
      );
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      const message = `Unable to change guest access for rooms to (${
        allowGuests ? 'Public' : 'Private'
      }): ${err}`;
      this.logger.error(message, err?.stack, LogContext.COMMUNICATION);
      throw err;
    }
  }

  private logInputPayload(
    event: MatrixAdapterEventType | undefined,
    payload: BaseMatrixAdapterEventPayload
  ): number {
    const randomID = getRandomId();
    const payloadData = stringifyWithoutAuthorizationMetaInfo(payload);
    this.logger.verbose?.(
      `[${event}-${randomID}] - Input payload: ${payloadData}`,
      LogContext.COMMUNICATION_EVENTS
    );
    return randomID;
  }

  private logResponsePayload(
    event: MatrixAdapterEventType | undefined,
    payload: BaseMatrixAdapterEventResponsePayload,
    eventID: number | undefined
  ) {
    const loggedData = stringifyWithoutAuthorizationMetaInfo(payload);
    this.logger.verbose?.(
      `...[${event}-${eventID}] - Response payload: ${loggedData}`,
      LogContext.COMMUNICATION_EVENTS
    );
  }

  private logInteractionError(
    event: MatrixAdapterEventType | undefined,
    error: any,
    eventID: number | undefined
  ) {
    this.logger.warn?.(
      `...[${event}-${eventID}] - Error: ${JSON.stringify(error)}`,
      LogContext.COMMUNICATION_EVENTS
    );
  }

  private makeRetryableAndPromisify<
    T extends BaseMatrixAdapterEventResponsePayload,
    TReturnType,
  >(
    input$: Observable<T>,
    resultSelector: (result: T) => TReturnType,
    options?: {
      logging?: {
        eventType?: MatrixAdapterEventType;
        eventID?: number;
        timeoutMessage?: string;
        retryMessage?: string;
        successMessage?: string;
        errorMessage?: string;
      };
    }
  ): Promise<TReturnType> {
    const { logging } = options ?? {};
    const {
      timeoutMessage,
      retryMessage,
      successMessage,
      errorMessage,
      eventType,
      eventID,
    } = logging ?? {};

    let retries = 1;

    const newInput$ = input$.pipe(
      // wait N ms for a response before failing
      timeout(this.timeout),
      // handle the timeout error
      catchError(err => {
        if (err instanceof TimeoutError) {
          if (timeoutMessage) {
            this.logger.error(
              timeoutMessage,
              err?.stack,
              LogContext.COMMUNICATION
            );
          }

          if (retries <= this.retries) {
            if (retryMessage) {
              this.logger.warn(
                `${retryMessage} [${retries}/${this.retries}]...`
              );
            }
            retries++;
          }

          throw new CommunicationTimedOutException();
        }
        throw err;
      }),
      // retry N times
      retry(this.retries)
    );

    return new Promise((res, rej) => {
      newInput$.subscribe({
        next: x => {
          this.logResponsePayload(eventType, x, eventID);
          if (successMessage) {
            this.logger.verbose?.(successMessage, LogContext.COMMUNICATION);
          }
          res(resultSelector(x));
        },
        error: (err: any) => {
          this.logInteractionError(eventType, err, eventID);
          rej(
            new MatrixEntityNotFoundException(
              `${errorMessage}: ${err?.message ?? err}`,
              LogContext.COMMUNICATION
            )
          );
        },
        complete: () => {
          rej('Subscription completed');
        },
      });
    });
  }
}
