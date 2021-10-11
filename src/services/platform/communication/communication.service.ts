import { ConfigurationTypes, LogContext } from '@common/enums';
import { NotEnabledException } from '@common/exceptions/not.enabled.exception';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MatrixAgentPool } from '@src/services/platform/matrix/agent-pool/matrix.agent.pool';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixGroupAdapterService } from '../matrix/adapter-group/matrix.group.adapter.service';
import { MatrixRoom } from '../matrix/adapter-room/matrix.room';
import { MatrixRoomAdapterService } from '../matrix/adapter-room/matrix.room.adapter.service';
import { MatrixRoomResponseMessage } from '../matrix/adapter-room/matrix.room.dto.response.message';
import { MatrixUserAdapterService } from '../matrix/adapter-user/matrix.user.adapter.service';
import { IOperationalMatrixUser } from '../matrix/adapter-user/matrix.user.interface';
import { MatrixAgent } from '../matrix/agent/matrix.agent';
import { MatrixAgentService } from '../matrix/agent/matrix.agent.service';
import { MatrixUserManagementService } from '../matrix/management/matrix.user.management.service';
import { CommunicationDeleteMessageFromCommunityRoomInput } from './communication.dto.delete.message.community';
import { CommunicationEditMessageOnCommunityRoomInput } from './communication.dto.edit.message.community';
import {
  CommunicationMessageResult,
  convertFromMatrixMessage,
} from './communication.dto.message.result';
import { CommunicationSendMessageCommunityInput } from './communication.dto.send.message.community';
import { CommunicationSendMessageUserInput } from './communication.dto.send.message.user';
import { CommunityRoom } from './communication.room.dto.community';
import { DirectRoom } from './communication.room.dto.direct';

@Injectable()
export class CommunicationService {
  private adminUser!: IOperationalMatrixUser;
  private matrixElevatedAgent!: MatrixAgent; // elevated as created with an admin account
  private adminEmail!: string;
  private adminCommunicationsID!: string;
  private adminPassword!: string;
  private enabled = false;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private matrixAgentService: MatrixAgentService,
    private matrixAgentPool: MatrixAgentPool,
    private configService: ConfigService,
    private matrixUserManagementService: MatrixUserManagementService,
    private matrixUserAdapterService: MatrixUserAdapterService,
    private matrixRoomAdapterService: MatrixRoomAdapterService,
    private matrixGroupAdapterService: MatrixGroupAdapterService
  ) {
    this.adminEmail = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.matrix?.admin?.username;
    this.adminPassword = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.matrix?.admin?.password;

    this.adminCommunicationsID =
      this.matrixUserAdapterService.convertEmailToMatrixId(this.adminEmail);

    // need both to be true
    this.enabled =
      this.configService.get(ConfigurationTypes.COMMUNICATIONS)?.enabled &&
      this.configService.get(ConfigurationTypes.IDENTITY)?.authentication
        ?.enabled;
  }

  async sendMessageToCommunityRoom(
    sendMessageData: CommunicationSendMessageCommunityInput
  ): Promise<string> {
    const matrixAgent = await this.acquireMatrixAgent(
      sendMessageData.senderCommunicationsID
    );
    const messageId = await this.matrixAgentService.sendMessage(
      matrixAgent,
      sendMessageData.roomID,
      {
        text: sendMessageData.message,
      }
    );

    return messageId;
  }

  async editMessageInCommunityRoom(
    editMessageData: CommunicationEditMessageOnCommunityRoomInput
  ): Promise<void> {
    const matrixAgent = await this.acquireMatrixAgent(
      editMessageData.senderCommunicationsID
    );

    await this.matrixAgentService.editMessage(
      matrixAgent,
      editMessageData.roomID,
      editMessageData.messageId,
      {
        text: editMessageData.message,
      }
    );
  }

  async deleteMessageFromCommunityRoom(
    deleteMessageData: CommunicationDeleteMessageFromCommunityRoomInput
  ) {
    const matrixAgent = await this.acquireMatrixAgent(
      deleteMessageData.senderCommunicationsID
    );

    await this.matrixAgentService.deleteMessage(
      matrixAgent,
      deleteMessageData.roomID,
      deleteMessageData.messageId
    );
  }

  async sendMessageToUser(
    sendMessageUserData: CommunicationSendMessageUserInput
  ): Promise<string> {
    const matrixAgent = await this.acquireMatrixAgent(
      sendMessageUserData.senderCommunicationsID
    );

    // todo: not always reinitiate the room connection
    const roomID = await this.matrixAgentService.initiateMessagingToUser(
      matrixAgent,
      {
        text: '',
        matrixID: sendMessageUserData.receiverCommunicationsID,
      }
    );

    const messageId = await this.matrixAgentService.sendMessage(
      matrixAgent,
      roomID,
      {
        text: sendMessageUserData.message,
      }
    );

    return messageId;
  }

  private async acquireMatrixAgent(communicationsID: string) {
    if (!this.enabled) {
      throw new NotEnabledException(
        'Communications not enabled',
        LogContext.COMMUNICATION
      );
    }
    return await this.matrixAgentPool.acquire(communicationsID);
  }

  async getGlobalAdminUser() {
    if (this.adminUser) {
      return this.adminUser;
    }

    const adminExists = await this.matrixUserManagementService.isRegistered(
      this.adminCommunicationsID
    );
    if (adminExists) {
      this.logger.verbose?.(
        `Admin user is registered: ${this.adminEmail}, logging in...`,
        LogContext.COMMUNICATION
      );
      const adminUser = await this.matrixUserManagementService.login(
        this.adminCommunicationsID,
        this.adminPassword
      );
      this.adminUser = adminUser;
      return adminUser;
    }

    this.adminUser = await this.registerNewAdminUser();
    return this.adminUser;
  }

  async getMatrixManagementAgentElevated() {
    if (this.matrixElevatedAgent) {
      return this.matrixElevatedAgent;
    }

    const adminUser = await this.getGlobalAdminUser();
    this.matrixElevatedAgent = await this.matrixAgentService.createMatrixAgent(
      adminUser
    );

    await this.matrixElevatedAgent.start({
      registerTimelineMonitor: false,
      registerRoomMonitor: false,
    });

    return this.matrixElevatedAgent;
  }

  async registerNewAdminUser(): Promise<IOperationalMatrixUser> {
    return await this.matrixUserManagementService.register(
      this.adminCommunicationsID,
      this.adminPassword,
      true
    );
  }

  async createCommunityGroup(
    communityId: string,
    communityName: string
  ): Promise<string> {
    // If not enabled just return an empty string
    if (!this.enabled) {
      return '';
    }
    const elevatedMatrixAgent = await this.getMatrixManagementAgentElevated();
    const group = await this.matrixGroupAdapterService.createGroup(
      elevatedMatrixAgent.matrixClient,
      {
        groupId: communityId,
        profile: {
          name: communityName,
        },
      }
    );
    this.logger.verbose?.(
      `Created group using communityID '${communityId}', communityName '${communityName}': ${group}`,
      LogContext.COMMUNICATION
    );
    return group;
  }

  generateMatrixIDFromEmail(email: string): string {
    return this.matrixUserAdapterService.convertEmailToMatrixId(email);
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
    const elevatedMatrixAgent = await this.getMatrixManagementAgentElevated();
    const room = await this.matrixRoomAdapterService.createRoom(
      elevatedMatrixAgent.matrixClient,
      {
        groupId: groupID,
        metadata,
        createOpts: {
          name,
        },
      }
    );
    this.logger.verbose?.(
      `Created community room on group '${groupID}': ${room}`,
      LogContext.COMMUNICATION
    );
    return room;
  }

  async ensureUserHasAccesToCommunityMessaging(
    groupID: string,
    roomID: string,
    communicationsID: string
  ) {
    // If not enabled just return an empty string
    if (!this.enabled) {
      return '';
    }
    // todo: check that the user has access properly
    try {
      await this.addUserToCommunityMessaging(groupID, roomID, communicationsID);
    } catch (error) {
      this.logger.verbose?.(
        `Unable to add user ${communicationsID}: already added?: ${error}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async addUserToCommunityMessaging(
    groupID: string,
    roomID: string,
    communicationID: string
  ) {
    // If not enabled just return an empty string
    if (!this.enabled) {
      return '';
    }

    const elevatedAgent = await this.getMatrixManagementAgentElevated();
    const userAgent = await this.matrixAgentPool.acquire(communicationID);
    // first send invites to the room - the group invite fails once accepted
    // for multiple rooms in a group this will cause failure before inviting the user over
    // TODO: Need to add a check whether the user is already part of the room/group
    await this.matrixRoomAdapterService.inviteUsersToRoom(
      elevatedAgent.matrixClient,
      roomID,
      [userAgent.matrixClient]
    );
    await this.matrixGroupAdapterService.inviteUsersToGroup(
      elevatedAgent.matrixClient,
      groupID,
      [userAgent.matrixClient]
    );
  }

  async getCommunityRooms(communicationsID: string): Promise<CommunityRoom[]> {
    const rooms: CommunityRoom[] = [];
    // If not enabled just return an empty array
    if (!this.enabled) {
      return rooms;
    }
    const matrixAgent = await this.matrixAgentPool.acquire(communicationsID);

    const matrixCommunityRooms =
      await this.matrixAgentService.getCommunityRooms(matrixAgent);
    for (const matrixRoom of matrixCommunityRooms) {
      const room = await this.convertMatrixRoomToCommunityRoom(
        matrixRoom,
        matrixAgent.matrixClient.getUserId()
      );
      rooms.push(room);
    }
    return rooms;
  }

  async getDirectRooms(communicationsID: string): Promise<DirectRoom[]> {
    const rooms: DirectRoom[] = [];
    // If not enabled just return an empty array
    if (!this.enabled) {
      return rooms;
    }
    const matrixAgent = await this.matrixAgentPool.acquire(communicationsID);

    const matrixDirectRooms = await this.matrixAgentService.getDirectRooms(
      matrixAgent
    );
    for (const matrixRoom of matrixDirectRooms) {
      // todo: likely a bug in the email mapping below
      const room = await this.convertMatrixRoomToDirectRoom(
        matrixRoom,
        matrixRoom.receiverCommunicationsID || '',
        matrixAgent.matrixClient.getUserId()
      );
      rooms.push(room);
    }

    return rooms;
  }

  async getCommunityRoom(
    roomId: string,
    communicationsID: string
  ): Promise<CommunityRoom> {
    // If not enabled just return an empty room
    if (!this.enabled) {
      return {
        id: 'communications-not-enabled',
        messages: [],
      };
    }
    const matrixAgent = await this.matrixAgentPool.acquire(communicationsID);
    const matrixRoom = await this.matrixAgentService.getRoom(
      matrixAgent,
      roomId
    );
    return await this.convertMatrixRoomToCommunityRoom(
      matrixRoom,
      matrixAgent.matrixClient.getUserId()
    );
  }

  async getRoom(
    roomId: string,
    communicationsID: string
  ): Promise<CommunityRoom | DirectRoom> {
    // If not enabled just return an empty room
    if (!this.enabled) {
      return {
        id: 'communications-not-enabled',
        messages: [],
      };
    }
    const matrixAgent = await this.matrixAgentPool.acquire(communicationsID);
    const matrixRoom = await this.matrixAgentService.getRoom(
      matrixAgent,
      roomId
    );
    const mappedDirectRoomId =
      await this.matrixAgentService.getDirectRoomIdForRoomID(
        matrixAgent,
        matrixRoom.roomId
      );
    if (mappedDirectRoomId) {
      return await this.convertMatrixRoomToDirectRoom(
        matrixRoom,
        mappedDirectRoomId, // may need to convert from an matrix ID to matrix username
        matrixAgent.matrixClient.getUserId()
      );
    }
    return await this.convertMatrixRoomToCommunityRoom(
      matrixRoom,
      matrixAgent.matrixClient.getUserId()
    );
  }

  async convertMatrixRoomToDirectRoom(
    matrixRoom: MatrixRoom,
    receiverCommunicationsID: string,
    userId: string
  ): Promise<DirectRoom> {
    const roomResult = new DirectRoom();
    roomResult.id = matrixRoom.roomId;
    roomResult.messages = await this.getMatrixRoomTimelineAsMessages(
      matrixRoom,
      userId
    );
    roomResult.receiverID = receiverCommunicationsID;
    return roomResult;
  }

  async convertMatrixRoomToCommunityRoom(
    matrixRoom: MatrixRoom,
    userId: string
  ): Promise<CommunityRoom> {
    const roomResult = new CommunityRoom();
    roomResult.id = matrixRoom.roomId;
    roomResult.messages = await this.getMatrixRoomTimelineAsMessages(
      matrixRoom,
      userId
    );

    return roomResult;
  }

  async getMatrixRoomTimelineAsMessages(
    matrixRoom: MatrixRoom,
    userId: string
  ): Promise<CommunicationMessageResult[]> {
    // do NOT use the deprecated room.timeline property
    const timeline = matrixRoom.getLiveTimeline().getEvents();
    if (timeline) {
      return await this.convertMatrixTimelineToMessages(timeline, userId);
    }
    return [];
  }

  async convertMatrixTimelineToMessages(
    timeline: MatrixRoomResponseMessage[],
    userId: string
  ): Promise<CommunicationMessageResult[]> {
    const messages: CommunicationMessageResult[] = [];

    for (const timelineMessage of timeline) {
      const message = convertFromMatrixMessage(timelineMessage, userId);
      if (!message) {
        continue;
      }

      messages.push(message);
    }
    return messages;
  }
}
