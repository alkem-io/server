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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ROOM_SEND_MESSAGE },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomSendMessageResponsePayload>(
        response
      );
      const message = responseData.message;
      this.logger.verbose?.(
        `...message sent to room: ${sendMessageData.roomID}`,
        LogContext.COMMUNICATION
      );
      return message;
    } catch (err: any) {
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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ROOM_DETAILS },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomDetailsResponsePayload>(
        response
      );
      return responseData.room;
    } catch (err: any) {
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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ROOM_DELETE_MESSAGE },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomDeleteMessageResponsePayload>(response);
      return responseData.messageID;
    } catch (err: any) {
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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.SEND_MESSAGE_TO_USER },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<SendMessageToUserResponsePayload>(response);
      return responseData.messageID;
    } catch (err: any) {
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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ROOM_MESSAGE_SENDER },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RoomMessageSenderResponsePayload>(response);
      return responseData.senderID;
    } catch (err: any) {
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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.REGISTER_NEW_USER },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RegisterNewUserResponsePayload>(
        response
      );
      return responseData.userID;
    } catch (err: any) {
      this.logger.verbose?.(
        `Attempt to register user failed: ${err}; user registration for Communication to be re-tried later`,
        LogContext.COMMUNICATION
      );
    }
  }

  async convertMatrixLocalGroupIdToMatrixID(groupID: string): Promise<string> {
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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.CREATE_GROUP },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<CreateGroupResponsePayload>(
        response
      );
      this.logger.verbose?.(
        `Created group using communityID '${communityId}', communityName '${communityName}'`,
        LogContext.COMMUNICATION
      );
      return responseData.groupID;
    } catch (err: any) {
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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.CREATE_ROOM },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<CreateRoomResponsePayload>(
        response
      );
      this.logger.verbose?.(
        `Created community room on group '${groupID}'`,
        LogContext.COMMUNICATION
      );
      return responseData.roomID;
    } catch (err: any) {
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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ADD_USER_TO_ROOMS },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<AddUserToRoomsResponsePayload>(
        response
      );

      return responseData.success;
    } catch (err: any) {
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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ROOMS_USER },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomsUserResponsePayload>(
        response
      );

      return responseData.rooms;
    } catch (err: any) {
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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ROOMS_USER_DIRECT },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomsUserDirectResponsePayload>(
        response
      );

      return responseData.rooms;
    } catch (err: any) {
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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.REMOVE_USER_FROM_ROOMS },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<RemoveUserFromRoomsResponsePayload>(response);

      return responseData.success;
    } catch (err: any) {
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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ROOMS },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomsResponsePayload>(response);

      return responseData.rooms;
    } catch (err: any) {
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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.REPLICATE_ROOM_MEMBERSHIP },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<ReplicateRoomMembershipResponsePayload>(response);

      return responseData.success;
    } catch (err: any) {
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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ADD_USER_TO_ROOM },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<AddUserToRoomResponsePayload>(
        response
      );

      return responseData.success;
    } catch (err: any) {
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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.REMOVE_ROOM },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RemoveRoomResponsePayload>(
        response
      );
      this.logger.verbose?.(
        `[Membership] Removed members from room: ${matrixRoomID}`,
        LogContext.COMMUNICATION
      );
      return responseData.success;
    } catch (err: any) {
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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ROOM_MEMBERS },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomMembersResponsePayload>(
        response
      );

      userIDs = responseData.userIDs;
    } catch (err: any) {
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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.ROOM_JOIN_RULE },
      inputPayload
    );

    try {
      const responseData = await firstValueFrom<RoomJoinRuleResponsePayload>(
        response
      );

      return responseData.rule;
    } catch (err: any) {
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
    const response = this.matrixAdapterClient.send(
      { cmd: MatrixAdapterEventType.UPDATE_ROOMS_GUEST_ACCESS },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<UpdateRoomsGuestAccessResponsePayload>(response);

      return responseData.success;
    } catch (err: any) {
      this.logger.error?.(
        `Unable to change guest access for rooms to (${
          allowGuests ? 'Public' : 'Private'
        }): ${err}`,
        LogContext.COMMUNICATION
      );
      return false;
    }
  }
}
