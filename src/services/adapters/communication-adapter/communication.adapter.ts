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
} from '@alkemio/matrix-adapter-lib';
import { RoomDetailsPayload } from '@alkemio/matrix-adapter-lib';
import { RoomDetailsResponsePayload } from '@alkemio/matrix-adapter-lib';
import { firstValueFrom } from 'rxjs';
import { CommunicationSendMessageInput } from './dto/communication.dto.message.send';
import { RoomDeleteMessagePayload } from '@alkemio/matrix-adapter-lib';
import { RoomDeleteMessageResponsePayload } from '@alkemio/matrix-adapter-lib';
import { RoomMessageSenderResponsePayload } from '@alkemio/matrix-adapter-lib';
import { RoomMessageSenderPayload } from '@alkemio/matrix-adapter-lib';
import { CreateGroupPayload } from '@alkemio/matrix-adapter-lib';
import { CreateGroupResponsePayload } from '@alkemio/matrix-adapter-lib';
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

@Injectable()
export class CommunicationAdapter {
  private enabled = false;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService,
    @Inject(MATRIX_ADAPTER_SERVICE) private matrixAdapterClient: ClientProxy
  ) {
    // need both to be true
    this.enabled = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.enabled;
  }

  async sendMessage(
    sendMessageData: CommunicationSendMessageInput
  ): Promise<IMessage> {
    const inputPayload: RoomSendMessagePayload = {
      triggeredBy: '',
      roomID: sendMessageData.roomID,
      message: sendMessageData.message,
      senderID: sendMessageData.senderCommunicationsID,
    };
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.ROOM_SEND_MESSAGE,
      inputPayload
    );

    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ROOM_SEND_MESSAGE },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomSendMessageResponsePayload>(
        response
      );
      this.logResponsePayload(
        MatrixAdapterEventType.ROOM_SEND_MESSAGE,
        responseData,
        eventID
      );
      const message = responseData.message;
      this.logger.verbose?.(
        `...message sent to room: ${sendMessageData.roomID}`,
        LogContext.COMMUNICATION
      );
      return message;
    } catch (err: any) {
      this.logInteractionError(
        MatrixAdapterEventType.ROOM_SEND_MESSAGE,
        err,
        eventID
      );
      throw new MatrixEntityNotFoundException(
        `Failed to send message to room: ${err.message}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async getCommunityRoom(roomId: string): Promise<CommunicationRoomResult> {
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
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.ROOM_DETAILS,
      inputPayload
    );

    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ROOM_DETAILS },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomDetailsResponsePayload>(
        response
      );
      this.logResponsePayload(
        MatrixAdapterEventType.ROOM_DETAILS,
        responseData,
        eventID
      );
      return responseData.room;
    } catch (err: any) {
      this.logInteractionError(
        MatrixAdapterEventType.ROOM_DETAILS,
        err,
        eventID
      );
      throw new MatrixEntityNotFoundException(
        `Failed to obtain room: ${err.message}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async deleteMessage(
    deleteMessageData: CommunicationDeleteMessageInput
  ): Promise<string> {
    const inputPayload: RoomDeleteMessagePayload = {
      triggeredBy: '',
      roomID: deleteMessageData.roomID,
      messageID: deleteMessageData.messageId,
      senderID: deleteMessageData.senderCommunicationsID,
    };
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.ROOM_DELETE_MESSAGE,
      inputPayload
    );

    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ROOM_DELETE_MESSAGE },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomDeleteMessageResponsePayload>(response);
      this.logResponsePayload(
        MatrixAdapterEventType.ROOM_DELETE_MESSAGE,
        responseData,
        eventID
      );
      return responseData.messageID;
    } catch (err: any) {
      this.logInteractionError(
        MatrixAdapterEventType.ROOM_DELETE_MESSAGE,
        err,
        eventID
      );
      throw new MatrixEntityNotFoundException(
        `Failed to delete message from room: ${err.message}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async sendMessageToUser(
    sendMessageUserData: CommunicationSendMessageUserInput
  ): Promise<string> {
    const inputPayload: SendMessageToUserPayload = {
      triggeredBy: '',
      message: sendMessageUserData.message,
      receiverID: sendMessageUserData.receiverCommunicationsID,
      senderID: sendMessageUserData.senderCommunicationsID,
    };
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.SEND_MESSAGE_TO_USER,
      inputPayload
    );

    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.SEND_MESSAGE_TO_USER },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<SendMessageToUserResponsePayload>(response);
      this.logResponsePayload(
        MatrixAdapterEventType.SEND_MESSAGE_TO_USER,
        responseData,
        eventID
      );
      return responseData.messageID;
    } catch (err: any) {
      this.logInteractionError(
        MatrixAdapterEventType.SEND_MESSAGE_TO_USER,
        err,
        eventID
      );
      throw new MatrixEntityNotFoundException(
        `Failed to send message to user: ${err.message}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async getMessageSender(roomID: string, messageID: string): Promise<string> {
    const inputPayload: RoomMessageSenderPayload = {
      triggeredBy: '',
      roomID: roomID,
      messageID: messageID,
    };
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.ROOM_MESSAGE_SENDER,
      inputPayload
    );
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ROOM_MESSAGE_SENDER },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomMessageSenderResponsePayload>(response);
      this.logResponsePayload(
        MatrixAdapterEventType.ROOM_MESSAGE_SENDER,
        responseData,
        eventID
      );
      return responseData.senderID;
    } catch (err: any) {
      this.logInteractionError(
        MatrixAdapterEventType.ROOM_MESSAGE_SENDER,
        err,
        eventID
      );
      throw new MatrixEntityNotFoundException(
        `Unable to locate message (id: ${messageID}) in room: ${roomID}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async tryRegisterNewUser(email: string): Promise<string | undefined> {
    const inputPayload: RegisterNewUserPayload = {
      triggeredBy: '',
      email,
    };
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.REGISTER_NEW_USER,
      inputPayload
    );
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.REGISTER_NEW_USER },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RegisterNewUserResponsePayload>(
        response
      );
      this.logResponsePayload(
        MatrixAdapterEventType.REGISTER_NEW_USER,
        responseData,
        eventID
      );
      return responseData.userID;
    } catch (err: any) {
      this.logInteractionError(
        MatrixAdapterEventType.REGISTER_NEW_USER,
        err,
        eventID
      );
      this.logger.verbose?.(
        `Attempt to register user failed: ${err}; user registration for Communication to be re-tried later`,
        LogContext.COMMUNICATION
      );
    }
  }

  convertMatrixLocalGroupIdToMatrixID(groupID: string): string {
    const homeserverName = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.matrix?.homeserver_name;

    return `+${groupID}:${homeserverName}`;
  }

  async createCommunityGroup(
    communityId: string,
    communityName: string
  ): Promise<string> {
    // If not enabled just return an empty string
    if (!this.enabled) {
      return '';
    }
    if (!communityId || !communityName) {
      this.logger.error?.(
        `Attempt to register community group with empty data ${communityId}`,
        LogContext.COMMUNICATION
      );
      return '';
    }
    const inputPayload: CreateGroupPayload = {
      triggeredBy: '',
      communityID: communityId,
      communityDisplayName: communityName,
    };
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.CREATE_GROUP,
      inputPayload
    );
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.CREATE_GROUP },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<CreateGroupResponsePayload>(
        response
      );
      this.logResponsePayload(
        MatrixAdapterEventType.CREATE_GROUP,
        responseData,
        eventID
      );
      this.logger.verbose?.(
        `Created group using communityID '${communityId}', communityName '${communityName}'`,
        LogContext.COMMUNICATION
      );
      return responseData.groupID;
    } catch (err: any) {
      this.logInteractionError(
        MatrixAdapterEventType.CREATE_GROUP,
        err,
        eventID
      );
      throw new MatrixEntityNotFoundException(
        `Failed to create group: ${err.message}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async createCommunityRoom(
    groupID: string,
    name: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    // If not enabled just return an empty string
    if (!this.enabled) {
      return '';
    }
    const inputPayload: CreateRoomPayload = {
      triggeredBy: '',
      groupID: groupID,
      roomName: name,
      metadata: metadata,
    };
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.CREATE_ROOM,
      inputPayload
    );
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.CREATE_ROOM },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<CreateRoomResponsePayload>(
        response
      );
      this.logResponsePayload(
        MatrixAdapterEventType.CREATE_ROOM,
        responseData,
        eventID
      );
      this.logger.verbose?.(
        `Created community room on group '${groupID}'`,
        LogContext.COMMUNICATION
      );
      return responseData.roomID;
    } catch (err: any) {
      this.logInteractionError(
        MatrixAdapterEventType.CREATE_ROOM,
        err,
        eventID
      );
      throw new MatrixEntityNotFoundException(
        `Failed to create room: ${err.message}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async grantUserAccesToRooms(
    groupID: string,
    roomIDs: string[],
    matrixUserID: string
  ): Promise<boolean> {
    // If not enabled just return
    if (!this.enabled) {
      return false;
    }
    const inputPayload: AddUserToRoomsPayload = {
      triggeredBy: '',
      groupID,
      roomIDs,
      userID: matrixUserID,
    };
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.ADD_USER_TO_ROOMS,
      inputPayload
    );
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ADD_USER_TO_ROOMS },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<AddUserToRoomsResponsePayload>(
        response
      );
      this.logResponsePayload(
        MatrixAdapterEventType.ADD_USER_TO_ROOMS,
        responseData,
        eventID
      );
      return responseData.success;
    } catch (err: any) {
      this.logInteractionError(
        MatrixAdapterEventType.ADD_USER_TO_ROOMS,
        err,
        eventID
      );
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
    const inputPayload: RoomsUserPayload = {
      triggeredBy: '',
      userID: matrixUserID,
    };
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.ROOMS_USER,
      inputPayload
    );
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ROOMS_USER },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomsUserResponsePayload>(
        response
      );
      this.logResponsePayload(
        MatrixAdapterEventType.ROOMS_USER,
        responseData,
        eventID
      );
      return responseData.rooms;
    } catch (err: any) {
      this.logInteractionError(MatrixAdapterEventType.ROOMS_USER, err, eventID);
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
    const inputPayload: RoomsUserDirectPayload = {
      triggeredBy: '',
      userID: matrixUserID,
    };
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.ROOMS_USER_DIRECT,
      inputPayload
    );
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ROOMS_USER_DIRECT },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomsUserDirectResponsePayload>(
        response
      );
      this.logResponsePayload(
        MatrixAdapterEventType.ROOMS_USER_DIRECT,
        responseData,
        eventID
      );
      return responseData.rooms;
    } catch (err: any) {
      this.logInteractionError(
        MatrixAdapterEventType.ROOMS_USER_DIRECT,
        err,
        eventID
      );
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
    this.logger.verbose?.(
      `Removing user (${matrixUserID}) from rooms (${roomIDs})`,
      LogContext.COMMUNICATION
    );
    const inputPayload: RemoveUserFromRoomsPayload = {
      triggeredBy: '',
      userID: matrixUserID,
      roomIDs,
    };
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.REMOVE_USER_FROM_ROOMS,
      inputPayload
    );
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.REMOVE_USER_FROM_ROOMS },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RemoveUserFromRoomsResponsePayload>(response);
      this.logResponsePayload(
        MatrixAdapterEventType.REMOVE_USER_FROM_ROOMS,
        responseData,
        eventID
      );
      return responseData.success;
    } catch (err: any) {
      this.logInteractionError(
        MatrixAdapterEventType.REMOVE_USER_FROM_ROOMS,
        err,
        eventID
      );
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
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.ROOMS,
      inputPayload
    );
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ROOMS },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomsResponsePayload>(response);
      this.logResponsePayload(
        MatrixAdapterEventType.ROOMS,
        responseData,
        eventID
      );
      return responseData.rooms;
    } catch (err: any) {
      this.logInteractionError(MatrixAdapterEventType.ROOMS, err, eventID);
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
    const inputPayload: ReplicateRoomMembershipPayload = {
      triggeredBy: '',
      targetRoomID,
      sourceRoomID,
      userToPrioritize,
    };
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.REPLICATE_ROOM_MEMBERSHIP,
      inputPayload
    );
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.REPLICATE_ROOM_MEMBERSHIP },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<ReplicateRoomMembershipResponsePayload>(response);
      this.logResponsePayload(
        MatrixAdapterEventType.REPLICATE_ROOM_MEMBERSHIP,
        responseData,
        eventID
      );
      return responseData.success;
    } catch (err: any) {
      this.logInteractionError(
        MatrixAdapterEventType.REPLICATE_ROOM_MEMBERSHIP,
        err,
        eventID
      );
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
    const inputPayload: AddUserToRoomPayload = {
      triggeredBy: '',
      roomID,
      userID: matrixUserID,
    };
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.ADD_USER_TO_ROOM,
      inputPayload
    );
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ADD_USER_TO_ROOM },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<AddUserToRoomResponsePayload>(
        response
      );
      this.logResponsePayload(
        MatrixAdapterEventType.ADD_USER_TO_ROOM,
        responseData,
        eventID
      );
      return responseData.success;
    } catch (err: any) {
      this.logInteractionError(
        MatrixAdapterEventType.ADD_USER_TO_ROOM,
        err,
        eventID
      );
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
    const inputPayload: RemoveRoomPayload = {
      triggeredBy: '',
      roomID: matrixRoomID,
    };
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.REMOVE_ROOM,
      inputPayload
    );
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.REMOVE_ROOM },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RemoveRoomResponsePayload>(
        response
      );
      this.logResponsePayload(
        MatrixAdapterEventType.REMOVE_ROOM,
        responseData,
        eventID
      );
      this.logger.verbose?.(
        `[Membership] Removed members from room: ${matrixRoomID}`,
        LogContext.COMMUNICATION
      );
      return responseData.success;
    } catch (err: any) {
      this.logInteractionError(
        MatrixAdapterEventType.REMOVE_ROOM,
        err,
        eventID
      );
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
    const inputPayload: RoomMembersPayload = {
      triggeredBy: '',
      roomID: matrixRoomID,
    };
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.ROOM_MEMBERS,
      inputPayload
    );
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ROOM_MEMBERS },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomMembersResponsePayload>(
        response
      );
      this.logResponsePayload(
        MatrixAdapterEventType.ROOM_MEMBERS,
        responseData,
        eventID
      );
      userIDs = responseData.userIDs;
    } catch (err: any) {
      this.logInteractionError(
        MatrixAdapterEventType.ROOM_MEMBERS,
        err,
        eventID
      );
      this.logger.verbose?.(
        `Unable to get room members  (${matrixRoomID}): ${err}`,
        LogContext.COMMUNICATION
      );
      throw err;
    }

    return userIDs;
  }

  async getRoomJoinRule(roomID: string): Promise<string> {
    const inputPayload: RoomJoinRulePayload = {
      triggeredBy: '',
      roomID: roomID,
    };
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.ROOM_JOIN_RULE,
      inputPayload
    );
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ROOM_JOIN_RULE },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomJoinRuleResponsePayload>(
        response
      );
      this.logResponsePayload(
        MatrixAdapterEventType.ROOM_JOIN_RULE,
        responseData,
        eventID
      );
      return responseData.rule;
    } catch (err: any) {
      this.logInteractionError(
        MatrixAdapterEventType.ROOM_JOIN_RULE,
        err,
        eventID
      );
      this.logger.verbose?.(
        `Unable to get room join rule  (${roomID}): ${err}`,
        LogContext.COMMUNICATION
      );
      throw err;
    }
  }

  async setMatrixRoomsGuestAccess(roomIDs: string[], allowGuests = true) {
    const inputPayload: UpdateRoomsGuestAccessPayload = {
      triggeredBy: '',
      roomIDs,
      allowGuests,
    };
    const eventID = this.logInputPayload(
      MatrixAdapterEventType.UPDATE_ROOMS_GUEST_ACCESS,
      inputPayload
    );
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.UPDATE_ROOMS_GUEST_ACCESS },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<UpdateRoomsGuestAccessResponsePayload>(response);
      this.logResponsePayload(
        MatrixAdapterEventType.UPDATE_ROOMS_GUEST_ACCESS,
        responseData,
        eventID
      );
      return responseData.success;
    } catch (err: any) {
      this.logInteractionError(
        MatrixAdapterEventType.UPDATE_ROOMS_GUEST_ACCESS,
        err,
        eventID
      );
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
    event: MatrixAdapterEventType,
    payload: BaseMatrixAdapterEventPayload
  ): number {
    const randomID = getRandomId();
    this.logger.verbose?.(
      `[${event}-${randomID}] - Input payload: ${JSON.stringify(payload)}`,
      LogContext.COMMUNICATION_EVENTS
    );
    return randomID;
  }

  private logResponsePayload(
    event: MatrixAdapterEventType,
    payload: BaseMatrixAdapterEventResponsePayload,
    eventID: number
  ) {
    this.logger.verbose?.(
      `...[${event}-${eventID}] - Response payload: ${JSON.stringify(payload)}`,
      LogContext.COMMUNICATION_EVENTS
    );
  }

  private logInteractionError(
    event: MatrixAdapterEventType,
    error: any,
    eventID: number
  ) {
    this.logger.warn?.(
      `...[${event}-${eventID}] - Error: ${JSON.stringify(error)}`,
      LogContext.COMMUNICATION_EVENTS
    );
  }
}
