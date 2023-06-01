import { firstValueFrom, TimeoutError, Observable } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { MatrixEntityNotFoundException } from '@common/exceptions';
import { CommunicationRoomResult } from '@domain/communication/room/dto/communication.dto.room.result';
import { DirectRoomResult } from '@domain/community/user/dto/user.dto.communication.room.direct.result';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CommunicationDeleteMessageInput } from './dto/communication.dto.message.delete';
import { CommunicationSendMessageUserInput } from './dto/communication.dto.message.send.user';
import { IMessage } from '@domain/communication/message/message.interface';
import { MATRIX_ADAPTER_SERVICE } from '@common/constants';
import { ClientProxy } from '@nestjs/microservices';
import {
  MatrixAdapterEventType,
  RoomSendMessagePayload,
  RoomSendMessageResponsePayload,
  RoomSendMessageReplyPayload,
  RoomAddMessageReactionPayload,
  RoomRemoveMessageReactionPayload,
} from '@alkemio/matrix-adapter-lib';
import { RoomDetailsPayload } from '@alkemio/matrix-adapter-lib';
import { RoomDetailsResponsePayload } from '@alkemio/matrix-adapter-lib';
import { CommunicationSendMessageInput } from './dto/communication.dto.message.send';
import { RoomDeleteMessagePayload } from '@alkemio/matrix-adapter-lib';
import { RoomDeleteMessageResponsePayload } from '@alkemio/matrix-adapter-lib';
import { RoomMessageSenderResponsePayload } from '@alkemio/matrix-adapter-lib';
import { RoomMessageSenderPayload } from '@alkemio/matrix-adapter-lib';
import { CreateRoomPayload } from '@alkemio/matrix-adapter-lib';
import { CreateRoomResponsePayload } from '@alkemio/matrix-adapter-lib';
import { RoomsUserPayload } from '@alkemio/matrix-adapter-lib';
import { RoomsUserResponsePayload } from '@alkemio/matrix-adapter-lib';
import { RoomsPayload } from '@alkemio/matrix-adapter-lib';
import { RoomsResponsePayload } from '@alkemio/matrix-adapter-lib';
import { RemoveUserFromRoomsPayload } from '@alkemio/matrix-adapter-lib';
import { RemoveUserFromRoomsResponsePayload } from '@alkemio/matrix-adapter-lib';
import { ReplicateRoomMembershipPayload } from '@alkemio/matrix-adapter-lib';
import { ReplicateRoomMembershipResponsePayload } from '@alkemio/matrix-adapter-lib';
import { AddUserToRoomsPayload } from '@alkemio/matrix-adapter-lib';
import { AddUserToRoomsResponsePayload } from '@alkemio/matrix-adapter-lib';
import { RemoveRoomPayload } from '@alkemio/matrix-adapter-lib';
import { RemoveRoomResponsePayload } from '@alkemio/matrix-adapter-lib';
import { RoomMembersPayload } from '@alkemio/matrix-adapter-lib';
import { RoomMembersResponsePayload } from '@alkemio/matrix-adapter-lib';
import { RoomJoinRulePayload } from '@alkemio/matrix-adapter-lib';
import { RoomJoinRuleResponsePayload } from '@alkemio/matrix-adapter-lib';
import { UpdateRoomsGuestAccessPayload } from '@alkemio/matrix-adapter-lib';
import { UpdateRoomsGuestAccessResponsePayload } from '@alkemio/matrix-adapter-lib';
import { SendMessageToUserPayload } from '@alkemio/matrix-adapter-lib';
import { SendMessageToUserResponsePayload } from '@alkemio/matrix-adapter-lib';
import { RoomsUserDirectPayload } from '@alkemio/matrix-adapter-lib';
import { RoomsUserDirectResponsePayload } from '@alkemio/matrix-adapter-lib';
import { AddUserToRoomPayload } from '@alkemio/matrix-adapter-lib';
import { AddUserToRoomResponsePayload } from '@alkemio/matrix-adapter-lib';
import { RegisterNewUserPayload } from '@alkemio/matrix-adapter-lib';
import { RegisterNewUserResponsePayload } from '@alkemio/matrix-adapter-lib';
import { BaseMatrixAdapterEventPayload } from '@alkemio/matrix-adapter-lib';
import { BaseMatrixAdapterEventResponsePayload } from '@alkemio/matrix-adapter-lib/dist/dto/base.event.response.payload';
import { getRandomId } from '@common/utils/random.id.generator.util';
import { stringifyWithoutAuthorization } from '@common/utils/stringify.util';
import { CommunicationTimedOutException } from '@common/exceptions/communication';
import { CommunicationSendMessageReplyInput } from './dto/communications.dto.message.reply';
import { CommunicationAddRectionToMessageInput } from './dto/communication.dto.add.reaction';
import { CommunicationRemoveRectionToMessageInput } from './dto/communication.dto.remove.reaction';

@Injectable()
export class CommunicationAdapter {
  private readonly enabled = false;
  private readonly timeout: number;
  private readonly retries: number;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService,
    @Inject(MATRIX_ADAPTER_SERVICE) private matrixAdapterClient: ClientProxy
  ) {
    const communications = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    );
    this.enabled = communications?.enabled;
    this.timeout = +communications?.matrix?.connection_timeout * 1000;
    this.retries = +communications?.matrix?.connection_retries;
  }

  async sendMessage(
    sendMessageData: CommunicationSendMessageInput
  ): Promise<IMessage> {
    const eventType = MatrixAdapterEventType.ROOM_SEND_MESSAGE;
    const inputPayload: RoomSendMessagePayload = {
      triggeredBy: '',
      roomID: sendMessageData.roomID,
      message: sendMessageData.message,
      senderID: sendMessageData.senderCommunicationsID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);

    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomSendMessageResponsePayload>(
        response
      );
      this.logResponsePayload(eventType, responseData, eventID);

      const message = responseData.message;
      this.logger.verbose?.(
        `...message sent to room: ${sendMessageData.roomID}`,
        LogContext.COMMUNICATION
      );
      return message;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to send message to room: ${err.message}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async sendMessageReply(
    sendMessageData: CommunicationSendMessageReplyInput
  ): Promise<IMessage> {
    const eventType = MatrixAdapterEventType.ROOM_SEND_MESSAGE_REPLY;
    const inputPayload: RoomSendMessageReplyPayload = {
      triggeredBy: '',
      roomID: sendMessageData.roomID,
      message: sendMessageData.message,
      senderID: sendMessageData.senderCommunicationsID,
      threadID: sendMessageData.threadID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);

    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomSendMessageResponsePayload>(
        response
      );
      this.logResponsePayload(eventType, responseData, eventID);

      const message = responseData.message;
      this.logger.verbose?.(
        `...message sent to room: ${sendMessageData.roomID}`,
        LogContext.COMMUNICATION
      );
      return message;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to send message to room: ${err.message}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async addReaction(
    sendMessageData: CommunicationAddRectionToMessageInput
  ): Promise<IMessage> {
    const eventType = MatrixAdapterEventType.ROOM_ADD_REACTION_TO_MESSAGE;
    const inputPayload: RoomAddMessageReactionPayload = {
      triggeredBy: '',
      roomID: sendMessageData.roomID,
      text: sendMessageData.text,
      senderID: sendMessageData.senderCommunicationsID,
      messageID: sendMessageData.messageID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);

    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomSendMessageResponsePayload>(
        response
      );
      this.logResponsePayload(eventType, responseData, eventID);

      const message = responseData.message;
      this.logger.verbose?.(
        `...reaction added to message in room: ${sendMessageData.roomID}`,
        LogContext.COMMUNICATION
      );
      return message;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to add reaction to message in room: ${err.message}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async removeReaction(
    removeReactionData: CommunicationRemoveRectionToMessageInput
  ): Promise<string> {
    const eventType = MatrixAdapterEventType.ROOM_REMOVE_REACTION_TO_MESSAGE;
    const inputPayload: RoomRemoveMessageReactionPayload = {
      triggeredBy: '',
      roomID: removeReactionData.roomID,
      reactionID: removeReactionData.reactionID,
      senderID: removeReactionData.senderCommunicationsID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);

    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomDeleteMessageResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.messageID;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to remove from room: ${err.message}`,
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
      const responseData = await firstValueFrom<RoomDetailsResponsePayload>(
        response
      );
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.room;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to obtain room: ${err.message}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async deleteMessage(
    deleteMessageData: CommunicationDeleteMessageInput
  ): Promise<string> {
    const eventType = MatrixAdapterEventType.ROOM_DELETE_MESSAGE;
    const inputPayload: RoomDeleteMessagePayload = {
      triggeredBy: '',
      roomID: deleteMessageData.roomID,
      messageID: deleteMessageData.messageId,
      senderID: deleteMessageData.senderCommunicationsID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);

    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomDeleteMessageResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.messageID;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to delete message from room: ${err.message}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async sendMessageToUser(
    sendMessageUserData: CommunicationSendMessageUserInput
  ): Promise<string> {
    const eventType = MatrixAdapterEventType.SEND_MESSAGE_TO_USER;
    const inputPayload: SendMessageToUserPayload = {
      triggeredBy: '',
      message: sendMessageUserData.message,
      receiverID: sendMessageUserData.receiverCommunicationsID,
      senderID: sendMessageUserData.senderCommunicationsID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);

    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<SendMessageToUserResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.messageID;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to send message to user: ${err.message}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async getMessageSender(roomID: string, messageID: string): Promise<string> {
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
      return responseData.senderID;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Unable to locate message (id: ${messageID}) in room: ${roomID}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async tryRegisterNewUser(email: string): Promise<string | undefined> {
    const eventType = MatrixAdapterEventType.REGISTER_NEW_USER;
    const inputPayload: RegisterNewUserPayload = {
      triggeredBy: '',
      email,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RegisterNewUserResponsePayload>(
        response
      );
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.userID;
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
    const eventType = MatrixAdapterEventType.CREATE_ROOM;
    const inputPayload: CreateRoomPayload = {
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
      const responseData = await firstValueFrom<CreateRoomResponsePayload>(
        response
      );
      this.logResponsePayload(eventType, responseData, eventID);
      this.logger.verbose?.(
        `Created community room:'${responseData.roomID}'`,
        LogContext.COMMUNICATION
      );
      return responseData.roomID;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to create room: ${err.message}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async grantUserAccesToRooms(
    roomIDs: string[],
    matrixUserID: string
  ): Promise<boolean> {
    // If not enabled just return
    if (!this.enabled) {
      return false;
    }
    const eventType = MatrixAdapterEventType.ADD_USER_TO_ROOMS;
    const inputPayload: AddUserToRoomsPayload = {
      triggeredBy: '',
      roomIDs,
      userID: matrixUserID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<AddUserToRoomsResponsePayload>(
        response
      );
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.success;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      this.logger.warn?.(
        `Unable to add user (${matrixUserID}) to rooms (${roomIDs}): already added?: ${err}`,
        LogContext.COMMUNICATION
      );
      return false;
    }
  }

  async getCommunityRooms(
    matrixUserID: string
  ): Promise<CommunicationRoomResult[]> {
    const rooms: CommunicationRoomResult[] = [];
    // If not enabled just return an empty array
    if (!this.enabled) {
      return rooms;
    }
    const eventType = MatrixAdapterEventType.ROOMS_USER;
    const inputPayload: RoomsUserPayload = {
      triggeredBy: '',
      userID: matrixUserID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomsUserResponsePayload>(
        response
      );
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.rooms;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to get rooms for User: ${err.message}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async getDirectRooms(matrixUserID: string): Promise<DirectRoomResult[]> {
    const rooms: DirectRoomResult[] = [];
    // If not enabled just return an empty array
    if (!this.enabled) {
      return rooms;
    }
    const eventType = MatrixAdapterEventType.ROOMS_USER_DIRECT;
    const inputPayload: RoomsUserDirectPayload = {
      triggeredBy: '',
      userID: matrixUserID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomsUserDirectResponsePayload>(
        response
      );
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.rooms;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to get direct rooms for User: ${err.message}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async removeUserFromRooms(
    roomIDs: string[],
    matrixUserID: string
  ): Promise<boolean> {
    // If not enabled just return
    if (!this.enabled) {
      return false;
    }
    const eventType = MatrixAdapterEventType.REMOVE_USER_FROM_ROOMS;
    this.logger.verbose?.(
      `Removing user (${matrixUserID}) from rooms (${roomIDs})`,
      LogContext.COMMUNICATION
    );
    const inputPayload: RemoveUserFromRoomsPayload = {
      triggeredBy: '',
      userID: matrixUserID,
      roomIDs,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RemoveUserFromRoomsResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.success;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to remove user from rooms: ${err.message}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async getAllRooms(): Promise<CommunicationRoomResult[]> {
    const inputPayload: RoomsPayload = {
      triggeredBy: '',
    };
    const eventType = MatrixAdapterEventType.ROOMS;
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomsResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.rooms;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to get all rooms: ${err.message}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async replicateRoomMembership(
    targetRoomID: string,
    sourceRoomID: string,
    userToPrioritize: string
  ): Promise<boolean> {
    this.logger.verbose?.(
      `[Replication] Replicating room membership from ${sourceRoomID} to ${targetRoomID}`,
      LogContext.COMMUNICATION
    );
    const eventType = MatrixAdapterEventType.REPLICATE_ROOM_MEMBERSHIP;
    const inputPayload: ReplicateRoomMembershipPayload = {
      triggeredBy: '',
      targetRoomID,
      sourceRoomID,
      userToPrioritize,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<ReplicateRoomMembershipResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.success;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      throw new MatrixEntityNotFoundException(
        `Failed to replicate room membership: ${err.message}`,
        LogContext.COMMUNICATION
      );
    }
  }

  public async addUserToRoom(
    // groupID: string, according to matrix docs groups are getting deprecated
    roomID: string,
    matrixUserID: string
  ) {
    const eventType = MatrixAdapterEventType.ADD_USER_TO_ROOM;
    const inputPayload: AddUserToRoomPayload = {
      triggeredBy: '',
      roomID,
      userID: matrixUserID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<AddUserToRoomResponsePayload>(
        response
      );
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.success;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      this.logger.error?.(
        `[Membership] Exception user joining a room (user: ${matrixUserID}) room: ${roomID}) - ${err.toString()}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async removeRoom(matrixRoomID: string) {
    this.logger.verbose?.(
      `[Membership] Removing members from matrix room: ${matrixRoomID}`,
      LogContext.COMMUNICATION
    );
    const eventType = MatrixAdapterEventType.REMOVE_ROOM;
    const inputPayload: RemoveRoomPayload = {
      triggeredBy: '',
      roomID: matrixRoomID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RemoveRoomResponsePayload>(
        response
      );
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
      const responseData = await firstValueFrom<RoomMembersResponsePayload>(
        response
      );
      this.logResponsePayload(eventType, responseData, eventID);
      userIDs = responseData.userIDs;
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

  async getRoomJoinRule(roomID: string): Promise<string> {
    const eventType = MatrixAdapterEventType.ROOM_JOIN_RULE;
    const inputPayload: RoomJoinRulePayload = {
      triggeredBy: '',
      roomID: roomID,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomJoinRuleResponsePayload>(
        response
      );
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.rule;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      this.logger.verbose?.(
        `Unable to get room join rule  (${roomID}): ${err}`,
        LogContext.COMMUNICATION
      );
      throw err;
    }
  }

  async setMatrixRoomsGuestAccess(roomIDs: string[], allowGuests = true) {
    const eventType = MatrixAdapterEventType.UPDATE_ROOMS_GUEST_ACCESS;
    const inputPayload: UpdateRoomsGuestAccessPayload = {
      triggeredBy: '',
      roomIDs,
      allowGuests,
    };
    const eventID = this.logInputPayload(eventType, inputPayload);
    const response = this.matrixAdapterClient.send(
      { cmd: eventType },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<UpdateRoomsGuestAccessResponsePayload>(response);
      this.logResponsePayload(eventType, responseData, eventID);
      return responseData.success;
    } catch (err: any) {
      this.logInteractionError(eventType, err, eventID);
      this.logger.error?.(
        `Unable to change guest access for rooms to (${
          allowGuests ? 'Public' : 'Private'
        }): ${err}`,
        LogContext.COMMUNICATION
      );
      return false;
    }
  }

  private logInputPayload(
    event: MatrixAdapterEventType | undefined,
    payload: BaseMatrixAdapterEventPayload
  ): number {
    const randomID = getRandomId();
    const payloadData = stringifyWithoutAuthorization(payload);
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
    const loggedData = stringifyWithoutAuthorization(payload);
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

  private makeRetryableAndPromisify<T, TReturnType>(
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
            this.logger.error(timeoutMessage);
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
              `${errorMessage}: ${err.message}`,
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
