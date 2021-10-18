import { ConfigurationTypes, LogContext } from '@common/enums';
import { NotEnabledException } from '@common/exceptions/not.enabled.exception';
import { CommunicationMessageResult } from '@domain/common/communication/communication.dto.message.result';
import { CommunityRoomResult } from '@domain/community/community/dto/community.dto.room.result';
import { DirectRoomResult } from '@domain/community/user/dto/user.dto.communication.room.direct.result';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MatrixAgentPool } from '@src/services/platform/matrix/agent-pool/matrix.agent.pool';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixGroupAdapterService } from '../matrix/adapter-group/matrix.group.adapter.service';
import { MatrixMessageAdapterService } from '../matrix/adapter-message/matrix.message.adapter.service';
import { MatrixRoom } from '../matrix/adapter-room/matrix.room';
import { MatrixRoomAdapterService } from '../matrix/adapter-room/matrix.room.adapter.service';
import { MatrixRoomResponseMessage } from '../matrix/adapter-room/matrix.room.dto.response.message';
import { MatrixUserAdapterService } from '../matrix/adapter-user/matrix.user.adapter.service';
import { IOperationalMatrixUser } from '../matrix/adapter-user/matrix.user.interface';
import { MatrixAgent } from '../matrix/agent/matrix.agent';
import { MatrixAgentService } from '../matrix/agent/matrix.agent.service';
import { MatrixUserManagementService } from '../matrix/management/matrix.user.management.service';
import { CommunicationDeleteMessageFromCommunityRoomInput } from './dto/communication.dto.message.delete.community';
import { CommunicationEditMessageOnCommunityRoomInput } from './dto/communication.dto.message.edit.community';
import { CommunicationSendMessageCommunityInput } from './dto/communication.dto.message.send.community';
import { CommunicationSendMessageUserInput } from './dto/communication.dto.message.send.user';

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
    private matrixGroupAdapterService: MatrixGroupAdapterService,
    private matrixMessageAdapterService: MatrixMessageAdapterService
  ) {
    this.adminEmail = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.matrix?.admin?.username;
    this.adminPassword = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.matrix?.admin?.password;

    this.adminCommunicationsID =
      this.matrixUserAdapterService.convertEmailToMatrixID(this.adminEmail);

    // need both to be true
    this.enabled = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.enabled;
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

  private async acquireMatrixAgent(matrixUserId: string) {
    if (!this.enabled) {
      throw new NotEnabledException(
        'Communications not enabled',
        LogContext.COMMUNICATION
      );
    }
    return await this.matrixAgentPool.acquire(matrixUserId);
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

  async tryRegisterNewUser(email: string): Promise<string | undefined> {
    try {
      const matrixUserID =
        this.matrixUserAdapterService.convertEmailToMatrixID(email);

      const isRegistered = await this.matrixUserManagementService.isRegistered(
        matrixUserID
      );

      if (!isRegistered) {
        await this.matrixUserManagementService.register(matrixUserID);
      }

      return matrixUserID;
    } catch (error) {
      this.logger.error(error);
    }
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
    roomIDs: string[],
    matrixUserID: string
  ) {
    // If not enabled just return an empty string
    if (!this.enabled) {
      return '';
    }
    // todo: check that the user has access properly
    try {
      await this.addUserToCommunityMessaging(groupID, roomIDs, matrixUserID);
    } catch (error) {
      this.logger.verbose?.(
        `Unable to add user ${matrixUserID}: already added?: ${error}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async addUserToCommunityMessaging(
    groupID: string,
    roomIDs: string[],
    matrixUserID: string
  ) {
    // If not enabled just return an empty string
    if (!this.enabled) {
      return '';
    }

    const elevatedAgent = await this.getMatrixManagementAgentElevated();
    const userAgent = await this.matrixAgentPool.acquire(matrixUserID);
    // first send invites to the rooms - the group invite fails once accepted
    // for multiple rooms in a group this will cause failure before inviting the user over
    // TODO: Need to add a check whether the user is already part of the room/group
    for (const roomID of roomIDs) {
      await this.matrixRoomAdapterService.inviteUsersToRoom(
        elevatedAgent.matrixClient,
        roomID,
        [userAgent.matrixClient]
      );
    }
    await this.matrixGroupAdapterService.inviteUsersToGroup(
      elevatedAgent.matrixClient,
      groupID,
      [userAgent.matrixClient]
    );
  }

  async getCommunityRooms(
    matrixUserID: string
  ): Promise<CommunityRoomResult[]> {
    const rooms: CommunityRoomResult[] = [];
    // If not enabled just return an empty array
    if (!this.enabled) {
      return rooms;
    }
    const matrixAgent = await this.matrixAgentPool.acquire(matrixUserID);

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

  async getDirectRooms(matrixUserID: string): Promise<DirectRoomResult[]> {
    const rooms: DirectRoomResult[] = [];
    // If not enabled just return an empty array
    if (!this.enabled) {
      return rooms;
    }
    const matrixAgent = await this.matrixAgentPool.acquire(matrixUserID);

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
    matrixUserID: string
  ): Promise<CommunityRoomResult> {
    // If not enabled just return an empty room
    if (!this.enabled) {
      return {
        id: 'communications-not-enabled',
        messages: [],
      };
    }
    const matrixAgent = await this.matrixAgentPool.acquire(matrixUserID);
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
    matrixUserID: string
  ): Promise<CommunityRoomResult | DirectRoomResult> {
    // If not enabled just return an empty room
    if (!this.enabled) {
      return {
        id: 'communications-not-enabled',
        messages: [],
      };
    }
    const matrixAgent = await this.matrixAgentPool.acquire(matrixUserID);
    const matrixRoom = await this.matrixAgentService.getRoom(
      matrixAgent,
      roomId
    );
    const targetUserMatrixID =
      await this.matrixAgentService.getDirectUserMatrixIDForRoomID(
        matrixAgent,
        matrixRoom.roomId
      );
    if (targetUserMatrixID) {
      return await this.convertMatrixRoomToDirectRoom(
        matrixRoom,
        // may need to convert from an matrix ID to matrix username
        targetUserMatrixID,
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
    receiverMatrixID: string,
    userId: string
  ): Promise<DirectRoomResult> {
    const roomResult = new DirectRoomResult();
    roomResult.id = matrixRoom.roomId;
    roomResult.messages = await this.getMatrixRoomTimelineAsMessages(
      matrixRoom,
      userId
    );
    roomResult.receiverID = receiverMatrixID;
    return roomResult;
  }

  async convertMatrixRoomToCommunityRoom(
    matrixRoom: MatrixRoom,
    userId: string
  ): Promise<CommunityRoomResult> {
    const roomResult = new CommunityRoomResult();
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
    this.logger.verbose?.(
      `[MatrixRoom] Obtaining messages on room: ${matrixRoom.name}`,
      LogContext.COMMUNICATION
    );

    // do NOT use the deprecated room.timeline property
    const timeline = matrixRoom.getLiveTimeline();
    const timelineEvents = timeline.getEvents();
    if (timelineEvents) {
      return await this.convertMatrixTimelineToMessages(timelineEvents, userId);
    }
    return [];
  }

  async convertMatrixTimelineToMessages(
    timeline: MatrixRoomResponseMessage[],
    userId: string
  ): Promise<CommunicationMessageResult[]> {
    const messages: CommunicationMessageResult[] = [];

    for (const timelineMessage of timeline) {
      if (this.matrixMessageAdapterService.isEventToIgnore(timelineMessage))
        continue;
      const message = this.matrixMessageAdapterService.convertFromMatrixMessage(
        timelineMessage,
        userId
      );

      messages.push(message);
    }
    this.logger.verbose?.(
      `[MatrixRoom] Timeline converted: ${timeline.length} events ==> ${messages.length} messages`,
      LogContext.COMMUNICATION
    );
    return messages;
  }
}
