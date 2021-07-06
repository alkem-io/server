import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { MatrixAgentPool } from '@src/services/platform/matrix/agent-pool/matrix.agent.pool';
import { CommunicationMessageResult } from './communication.dto.message.result';

import { CommunicationSendMessageUserInput } from './communication.dto.send.msg.user';
import { CommunicationSendMessageCommunityInput } from './communication.dto.send.msg.community';
import { MatrixUserManagementService } from '../matrix/management/matrix.user.management.service';
import { IOperationalMatrixUser } from '../matrix/adapter-user/matrix.user.interface';
import { ConfigService } from '@nestjs/config';
import { MatrixUserAdapterService } from '../matrix/adapter-user/matrix.user.adapter.service';
import { MatrixRoomAdapterService } from '../matrix/adapter-room/matrix.room.adapter.service';
import { MatrixGroupAdapterService } from '../matrix/adapter-group/matrix.group.adapter.service';
import { MatrixAgent } from '../matrix/agent/matrix.agent';
import { NotEnabledException } from '@common/exceptions/not.enabled.exception';
import { MatrixAgentService } from '../matrix/agent/matrix.agent.service';
import { MatrixRoom } from '../matrix/adapter-room/matrix.room';
import { CommunityRoom } from './communication.room.dto.community';
import { MatrixRoomResponseMessage } from '../matrix/adapter-room/matrix.room.dto.response.message';
import { DirectRoom } from './communication.room.dto.direct';

@Injectable()
export class CommunicationService {
  private adminUser!: IOperationalMatrixUser;
  private matrixElevatedAgent!: MatrixAgent; // elevated as created with an admin account
  private adminUserName!: string;
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
    this.adminUserName = this.configService.get(
      ConfigurationTypes.Communications
    )?.matrix?.admin?.username;
    this.adminPassword = this.configService.get(
      ConfigurationTypes.Communications
    )?.matrix?.admin?.password;

    // need both to be true
    this.enabled =
      this.configService.get(ConfigurationTypes.Communications)?.enabled &&
      this.configService.get(ConfigurationTypes.Identity)?.authentication
        ?.enabled;
  }

  async sendMsgCommunity(
    sendMsgData: CommunicationSendMessageCommunityInput
  ): Promise<string> {
    if (!this.enabled) {
      throw new NotEnabledException(
        'Communications not enabled',
        LogContext.COMMUNICATION
      );
    }
    const matrixAgent = await this.matrixAgentPool.acquire(
      sendMsgData.sendingUserEmail
    );
    await this.matrixAgentService.message(matrixAgent, sendMsgData.roomID, {
      text: sendMsgData.message,
    });

    return sendMsgData.roomID;
  }

  async sendMsgUser(
    sendMsgUserData: CommunicationSendMessageUserInput
  ): Promise<string> {
    if (!this.enabled) {
      throw new NotEnabledException(
        'Communications not enabled',
        LogContext.COMMUNICATION
      );
    }
    const matrixAgent = await this.matrixAgentPool.acquire(
      sendMsgUserData.sendingUserEmail
    );

    // todo: not always reinitiate the room connection
    const roomID = await this.matrixAgentService.initiateMessagingToUser(
      matrixAgent,
      {
        text: '',
        email: sendMsgUserData.receiverID,
      }
    );

    await this.matrixAgentService.message(matrixAgent, roomID, {
      text: sendMsgUserData.message,
    });

    return roomID;
  }

  async getGlobalAdminUser() {
    if (this.adminUser) {
      return this.adminUser;
    }

    const adminExists = await this.matrixUserManagementService.isRegistered(
      this.adminUserName
    );
    if (adminExists) {
      this.logger.verbose?.(
        `Admin user is registered: ${this.adminUserName}, logging in...`,
        LogContext.COMMUNICATION
      );
      const adminUser = await this.matrixUserManagementService.login(
        this.adminUserName,
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
    return this.matrixElevatedAgent;
  }

  async registerNewAdminUser(): Promise<IOperationalMatrixUser> {
    return await this.matrixUserManagementService.register(
      this.adminUserName,
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

  async createCommunityRoom(groupID: string): Promise<string> {
    // If not enabled just return an empty string
    if (!this.enabled) {
      return '';
    }
    const elevatedMatrixAgent = await this.getMatrixManagementAgentElevated();
    const room = await this.matrixRoomAdapterService.createRoom(
      elevatedMatrixAgent.matrixClient,
      {
        communityId: groupID,
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
    email: string
  ) {
    // If not enabled just return an empty string
    if (!this.enabled) {
      return '';
    }
    // todo: check that the user has access properly
    try {
      await this.addUserToCommunityMessaging(groupID, roomID, email);
    } catch (error) {
      this.logger.verbose?.(
        `Unable to add user ${email}: already added?: ${error}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async addUserToCommunityMessaging(
    groupID: string,
    roomID: string,
    email: string
  ) {
    // If not enabled just return an empty string
    if (!this.enabled) {
      return '';
    }
    const matrixUsername = this.matrixUserAdapterService.email2id(email);
    const elevatedAgent = await this.getMatrixManagementAgentElevated();
    await this.matrixGroupAdapterService.inviteUsersToGroup(
      elevatedAgent.matrixClient,
      groupID,
      [matrixUsername]
    );
    await this.matrixRoomAdapterService.inviteUsersToRoom(
      elevatedAgent.matrixClient,
      roomID,
      [matrixUsername]
    );
  }

  async getCommunityRooms(currentUserEmail: string): Promise<CommunityRoom[]> {
    const rooms: CommunityRoom[] = [];
    // If not enabled just return an empty array
    if (!this.enabled) {
      return rooms;
    }
    const matrixAgent = await this.matrixAgentPool.acquire(currentUserEmail);

    const matrixCommunityRooms = await this.matrixAgentService.getCommunityRooms(
      matrixAgent
    );
    for (const matrixRoom of matrixCommunityRooms) {
      const room = await this.convertMatrixRoomToCommunityRoom(matrixRoom);
      rooms.push(room);
    }
    return rooms;
  }

  async getDirectRooms(currentUserEmail: string): Promise<DirectRoom[]> {
    const rooms: DirectRoom[] = [];
    // If not enabled just return an empty array
    if (!this.enabled) {
      return rooms;
    }
    const matrixAgent = await this.matrixAgentPool.acquire(currentUserEmail);

    const matrixDirectRooms = await this.matrixAgentService.getCommunityRooms(
      matrixAgent
    );
    for (const matrixRoom of matrixDirectRooms) {
      // todo: likely a bug in the email mapping below
      const room = await this.convertMatrixRoomToDirectRoom(
        matrixRoom,
        matrixRoom.receiverEmail || ''
      );
      rooms.push(room);
    }

    return rooms;
  }

  async getCommunityRoom(
    roomId: string,
    currentUserEmail: string
  ): Promise<CommunityRoom> {
    // If not enabled just return an empty room
    if (!this.enabled) {
      return {
        id: 'communications-not-enabled',
        messages: [],
      };
    }
    const matrixAgent = await this.matrixAgentPool.acquire(currentUserEmail);
    const matrixRoom = await this.matrixAgentService.getRoom(
      matrixAgent,
      roomId
    );
    return await this.convertMatrixRoomToCommunityRoom(matrixRoom);
  }

  async getRoom(
    roomId: string,
    currentUserEmail: string
  ): Promise<CommunityRoom | DirectRoom> {
    // If not enabled just return an empty room
    if (!this.enabled) {
      return {
        id: 'communications-not-enabled',
        messages: [],
      };
    }
    const matrixAgent = await this.matrixAgentPool.acquire(currentUserEmail);
    const matrixRoom = await this.matrixAgentService.getRoom(
      matrixAgent,
      roomId
    );
    const mappedDirectRoomId = await this.matrixAgentService.getDirectRoomIdForRoomID(
      matrixAgent,
      matrixRoom.roomId
    );
    if (mappedDirectRoomId) {
      const emailReceiver = this.matrixUserAdapterService.id2email(
        mappedDirectRoomId
      );
      await this.convertMatrixRoomToDirectRoom(matrixRoom, emailReceiver);
    }
    return await this.convertMatrixRoomToCommunityRoom(matrixRoom);
  }

  async convertMatrixRoomToDirectRoom(
    matrixRoom: MatrixRoom,
    emailReceiver: string
  ): Promise<DirectRoom> {
    const roomResult = new DirectRoom();
    roomResult.id = matrixRoom.roomId;
    if (matrixRoom.timeline) {
      roomResult.messages = await this.convertMatrixTimelineToMessages(
        matrixRoom.timeline
      );
    }
    roomResult.receiverID = this.matrixUserAdapterService.id2email(
      emailReceiver
    );
    return roomResult;
  }

  async convertMatrixRoomToCommunityRoom(
    matrixRoom: MatrixRoom
  ): Promise<CommunityRoom> {
    const roomResult = new CommunityRoom();
    roomResult.id = matrixRoom.roomId;
    if (matrixRoom.timeline) {
      roomResult.messages = await this.convertMatrixTimelineToMessages(
        matrixRoom.timeline
      );
    }
    return roomResult;
  }

  async convertMatrixTimelineToMessages(
    timeline: MatrixRoomResponseMessage[]
  ): Promise<CommunicationMessageResult[]> {
    const messages: CommunicationMessageResult[] = [];

    for (const { event: ev, sender } of timeline) {
      if (!ev.content?.body) {
        continue;
      }

      const user = this.matrixUserAdapterService.id2email(sender.name);
      const roomMessage: CommunicationMessageResult = {
        message: ev.content.body,
        sender: user ? `${user}` : 'unknown',
        timestamp: ev.origin_server_ts,
      };

      messages.push(roomMessage);
    }
    return messages;
  }
}
