import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { UserService } from '@domain/community/user/user.service';
import { MatrixAgentPool } from '@src/services/platform/matrix/agent-pool/matrix.agent.pool';
import { CommunicationMessageResult } from './communication.dto.message.result';
import {
  CommunicationRoomResult,
  CommunicationRoomDetailsResult,
} from './communication.dto.room.result';
import { CommunicationSendMessageUserInput } from './communication.dto.send.msg.user';
import { CommunicationSendMessageCommunityInput } from './communication.dto.send.msg.community';
import { MatrixIdentifierAdapter } from '../matrix/user/matrix.user.identifier.adapter';
import { MatrixUserManagementService } from '../matrix/management/matrix.user.management.service';
import { IOperationalMatrixUser } from '../matrix/user/matrix.user.interface';
import { ConfigService } from '@nestjs/config';
import { MatrixManagementAgentElevated } from '../matrix/management/matrix.management.agent.elevated';

@Injectable()
export class CommunicationService {
  // the matrixadminn@cherrytwist.org might already be registered with unknown password
  // reseting it is not an option as far as I know
  private adminUserId = 'matrixadmin@alkemio.org';
  private adminUser!: IOperationalMatrixUser;
  private matrixElevatedAgent!: MatrixManagementAgentElevated;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private userService: UserService,
    private matrixAgentPool: MatrixAgentPool,
    private configService: ConfigService,
    private matrixUserManagementService: MatrixUserManagementService
  ) {}

  async sendMsgCommunity(
    sendMsgData: CommunicationSendMessageCommunityInput
  ): Promise<string> {
    const communicationService = await this.matrixAgentPool.acquire(
      sendMsgData.sendingUserEmail
    );
    await communicationService.message(sendMsgData.roomID, {
      text: sendMsgData.message,
    });

    return sendMsgData.roomID;
  }

  async sendMsgUser(
    sendMsgUserData: CommunicationSendMessageUserInput
  ): Promise<string> {
    const communicationService = await this.matrixAgentPool.acquire(
      sendMsgUserData.sendingUserEmail
    );

    // todo: not always reinitiate the room connection
    const roomID = await communicationService.initiateMessagingToUser({
      email: sendMsgUserData.receiverID,
    });

    await communicationService.message(roomID, {
      text: sendMsgUserData.message,
    });

    return roomID;
  }

  async getGlobalAdminUser() {
    if (this.adminUser) {
      return this.adminUser;
    }

    const adminExists = await this.matrixUserManagementService.isRegistered(
      this.adminUserId
    );
    if (adminExists) {
      this.logger.verbose?.(
        `Admin user is registered: ${this.adminUserId}, logging in...`,
        LogContext.COMMUNICATION
      );
      const adminUser = await this.matrixUserManagementService.login(
        this.adminUserId
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

    this.matrixElevatedAgent = new MatrixManagementAgentElevated(
      this.configService,
      await this.getGlobalAdminUser()
    );
    return this.matrixElevatedAgent;
  }

  async registerNewAdminUser(): Promise<IOperationalMatrixUser> {
    this.logger.verbose?.(
      `creating new admin user using idenfitier: ${this.adminUserId}`,
      LogContext.COMMUNICATION
    );
    const adminUser = await this.matrixUserManagementService.register(
      this.adminUserId,
      true
    );
    this.logger.verbose?.(
      `...created, accessToken: ${adminUser.accessToken}`,
      LogContext.COMMUNICATION
    );
    return adminUser;
  }

  async createCommunityGroup(
    communityId: string,
    communityName: string
  ): Promise<string> {
    this.logger.verbose?.(
      `creating community group with id: '${communityId}' & name: ${communityName}`,
      LogContext.COMMUNICATION
    );
    const elevatedMatrixAgent = await this.getMatrixManagementAgentElevated();
    const group = await elevatedMatrixAgent.createGroup({
      groupId: communityId,
      profile: {
        name: communityName,
      },
    });
    this.logger.verbose?.(`...created: '${group}'`, LogContext.COMMUNICATION);

    return group;
  }

  async createCommunityRoom(groupID: string): Promise<string> {
    this.logger.verbose?.(
      `creating community room on group: ${groupID}`,
      LogContext.COMMUNICATION
    );
    const elevatedMatrixAgent = await this.getMatrixManagementAgentElevated();
    const room = await elevatedMatrixAgent.createRoom({
      communityId: groupID,
    });
    this.logger.verbose?.(
      `...community room on group: ${room}`,
      LogContext.COMMUNICATION
    );

    return room;
  }

  async addUserToCommunityRooms() {
    return undefined;
  }

  async getRooms(email: string): Promise<CommunicationRoomResult[]> {
    const communicationService = await this.matrixAgentPool.acquire(email);
    const roomResponse = await communicationService.getRooms();
    return await Promise.all(
      roomResponse.map(rr =>
        this.bootstrapRoom(rr.roomID, rr.isDirect, rr.receiverEmail, [])
      )
    );
  }

  async getRoom(
    roomId: string,
    email: string
  ): Promise<CommunicationRoomDetailsResult> {
    const communicationService = await this.matrixAgentPool.acquire(email);
    const {
      roomID,
      isDirect,
      receiverEmail,
      timeline,
    } = await communicationService.getRoom(roomId);

    const room = await this.bootstrapRoom(
      roomID,
      isDirect,
      receiverEmail,
      timeline
    );

    return room;
  }

  async getCommunityRoom(
    roomId: string
  ): Promise<CommunicationRoomDetailsResult> {
    return await this.getRoom(roomId, this.adminUserId);
  }

  private async bootstrapRoom(
    roomId: string,
    isDirect: boolean,
    receiverEmail: string,
    messages: Array<{ event: any; sender: any }>
  ): Promise<CommunicationRoomDetailsResult> {
    const room = new CommunicationRoomDetailsResult();
    room.id = roomId;
    room.isDirect = isDirect;

    const receiver = await this.userService.getUserByEmail(receiverEmail);

    if (!receiver) {
      delete room.receiverID;
    } else {
      room.receiverID = `${receiver.id}`;
    }

    const senderEmails = [
      ...new Set(
        messages.map(m => MatrixIdentifierAdapter.id2email(m.sender.name))
      ),
    ];
    const users = await Promise.all(
      senderEmails.map(e => this.userService.getUserByEmail(e))
    );

    room.messages = [];

    for (const { event: ev, sender } of messages) {
      if (!ev.content?.body) {
        continue;
      }
      const user = users.find(
        u => u && u.email === MatrixIdentifierAdapter.id2email(sender.name)
      );
      const roomMessage: CommunicationMessageResult = {
        message: ev.content.body,
        sender: user ? `${user.id}` : 'unknown',
        timestamp: ev.origin_server_ts,
      };

      room.messages.push(roomMessage);
    }

    return room;
  }
}
