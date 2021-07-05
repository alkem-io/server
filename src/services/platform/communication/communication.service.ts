import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { UserService } from '@domain/community/user/user.service';
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
import { MatrixRoom } from '../matrix/adapter-room/matrix.room.dto.result';
import { CommunicationRoomResult } from './communication.room.dto.result';
import { MatrixRoomResponseMessage } from '../matrix/adapter-room/matrix.room.dto.response.message';

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
    private userService: UserService,
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
    this.enabled = this.configService.get(
      ConfigurationTypes.Communications
    )?.enabled;
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

  async getRooms(email: string): Promise<CommunicationRoomResult[]> {
    // If not enabled just return an empty array
    if (!this.enabled) {
      return [];
    }
    const matrixAgent = await this.matrixAgentPool.acquire(email);
    const matrixRooms = await this.matrixAgentService.getRooms(matrixAgent);
    const rooms: CommunicationRoomResult[] = [];
    for (const matrixRoom of matrixRooms) {
      const room = await this.convertToRoomResult(matrixRoom);
      rooms.push(room);
    }
    return rooms;
  }

  async getRoom(
    roomId: string,
    email: string
  ): Promise<CommunicationRoomResult> {
    // If not enabled just return an empty room
    if (!this.enabled) {
      return {
        id: 'communications-not-enabled',
        messages: [],
        isDirect: false,
      };
    }
    const matrixAgent = await this.matrixAgentPool.acquire(email);
    const matrixRoom = await this.matrixAgentService.getRoom(
      matrixAgent,
      roomId
    );

    return await this.convertToRoomResult(matrixRoom);
  }

  private async convertToRoomResult(
    matrixRoom: MatrixRoom
  ): Promise<CommunicationRoomResult> {
    const roomResult: CommunicationRoomResult = new CommunicationRoomResult();
    roomResult.id = matrixRoom.roomID;
    roomResult.isDirect = matrixRoom.isDirect || false;

    if (matrixRoom.receiverEmail) {
      const receiver = await this.userService.getUserByEmail(
        matrixRoom.receiverEmail
      );
      if (receiver) roomResult.receiverID = receiver?.id;
    }

    if (matrixRoom.timeline) {
      roomResult.messages = await this.convertTimelineToMessages(
        matrixRoom.timeline
      );
    }

    return roomResult;
  }

  async convertTimelineToMessages(
    timeline: MatrixRoomResponseMessage[]
  ): Promise<CommunicationMessageResult[]> {
    const messages: CommunicationMessageResult[] = [];
    const senderEmails = [
      ...new Set(
        timeline.map(msg =>
          this.matrixUserAdapterService.id2email(msg.sender.name)
        )
      ),
    ];
    const users = await Promise.all(
      senderEmails.map(senderEmail =>
        this.userService.getUserByEmail(senderEmail)
      )
    );

    for (const { event: ev, sender } of timeline) {
      if (!ev.content?.body) {
        continue;
      }
      const user = users.find(
        u =>
          u && u.email === this.matrixUserAdapterService.id2email(sender.name)
      );
      const roomMessage: CommunicationMessageResult = {
        message: ev.content.body,
        sender: user ? `${user.id}` : 'unknown',
        timestamp: ev.origin_server_ts,
      };

      messages.push(roomMessage);
    }
    return messages;
  }
}
