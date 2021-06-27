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

@Injectable()
export class CommunicationService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private userService: UserService,
    private matrixAgentPool: MatrixAgentPool,
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
    this.logger.verbose?.('creating new admin', LogContext.COLLABORATION);
  }

  async registerNewAdminUser() {
    // do some magic + return
    // python register_new_matrix_user.py -u ct-admin-test -p ct-admin-pass -a -k "T0.VmXT3PF.=4QwzTw~6ZAJ0MDK:DqP6PUQwCVwe:INH~oU#JA" http://localhost:8008
    const adminUserId = 'matrixadmin@cherrytwist.org';
    this.logger.verbose?.(
      `creating new admin user using idenfitier: ${adminUserId}`,
      LogContext.COMMUNICATiON
    );
    const adminUser = await this.matrixUserManagementService.register(
      adminUserId,
      true
    );
    this.logger.verbose?.(
      `...created: ${adminUser.accessToken}`,
      LogContext.COMMUNICATiON
    );
  }

  async createCommunityGroup(
    communityName: string,
    matrixAdminUsername: string,
    matrixAdminPassword: string
  ): Promise<string> {
    // const elevatedMatrixAgent = new MatrixManagementAgentElevated(
    //   matrixAdminUsername,
    //   matrixAdminPassword
    // );
    // return elevatedMatrixAgent.createGroup({
    //   groupId: communityName,
    //   profile: {
    //     name: communityName,
    //   },
    // });
    this.logger.verbose?.(
      `creating community ${communityName} using credentials ${matrixAdminPassword} + ${matrixAdminUsername}`,
      LogContext.COLLABORATION
    );
    return '';
  }

  async createCommunityRoom(
    groupID: string,
    matrixAdminUsername: string,
    matrixAdminPassword: string
  ): Promise<string> {
    // const operationalAdminUser: IOperationalMatrixUser = {
    //   name: '',
    //   username: matrixAdminUsername,
    //   password: matrixAdminPassword,
    //   accessToken: '',
    // };
    // const elevatedMatrixAgent = new MatrixManagementAgentElevated(
    //   matrixAdminUsername,
    //   matrixAdminPassword
    // );

    // return elevatedMatrixAgent.createRoom({
    //   communityId: groupID,
    // });

    this.logger.verbose?.(
      `creating community ${groupID} using credentials ${matrixAdminPassword} + ${matrixAdminUsername}`,
      LogContext.COLLABORATION
    );
    return '';
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
