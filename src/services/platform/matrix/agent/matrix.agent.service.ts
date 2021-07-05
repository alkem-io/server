import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { createClient } from 'matrix-js-sdk';
import { IOperationalMatrixUser } from '../adapter-user/matrix.user.interface';
import { MatrixUserAdapterService } from '../adapter-user/matrix.user.adapter.service';
import { MatrixAgent } from './matrix.agent';
import { MatrixClient } from '../types/matrix.client.type';
import { MatrixRoomAdapterService } from '../adapter-room/matrix.room.adapter.service';
import { MatrixGroupAdapterService } from '../adapter-group/matrix.group.adapter.service';
import { IMatrixAgent } from './matrix.agent.interface';
import { MatrixAgentMessageRequestCommunity } from './matrix.agent.dto.message.request.community';
import { MatrixAgentMessageRequestDirect } from './matrix.agent.dto.message.request.direct';
import { MatrixAgentMessageRequest } from './matrix.agent.dto.message.request';
import { MatrixRoom } from '../adapter-room/matrix.room.dto.result';
import { MatrixEntityNotFoundException } from '@common/exceptions';

@Injectable()
export class MatrixAgentService {
  constructor(
    private configService: ConfigService,
    private matrixUserAdapterService: MatrixUserAdapterService,
    private matrixRoomAdapterService: MatrixRoomAdapterService,
    private matrixGroupAdapterService: MatrixGroupAdapterService
  ) {}

  async createMatrixAgent(
    operator: IOperationalMatrixUser
  ): Promise<MatrixAgent> {
    const matrixClient = await this.createMatrixClient(operator);
    return new MatrixAgent(matrixClient, this.matrixRoomAdapterService);
  }

  async createMatrixClient(
    operator: IOperationalMatrixUser
  ): Promise<MatrixClient> {
    const idBaseUrl = this.configService.get(ConfigurationTypes.Communications)
      ?.matrix?.server?.url;
    const baseUrl = this.configService.get(ConfigurationTypes.Communications)
      ?.matrix?.server?.url;

    if (!idBaseUrl || !baseUrl) {
      throw new Error('Matrix configuration is not provided');
    }

    return createClient({
      baseUrl: baseUrl,
      idBaseUrl: idBaseUrl,
      userId: operator.username,
      accessToken: operator.accessToken,
    });
  }

  async getCommunities(matrixAgent: IMatrixAgent): Promise<any[]> {
    return matrixAgent.matrixClient.getGroups() || [];
  }

  async getRooms(matrixAgent: IMatrixAgent): Promise<MatrixRoom[]> {
    const matrixClient = matrixAgent.matrixClient;
    const communityMap = await this.matrixGroupAdapterService.communityRooms(
      matrixClient
    );
    const communityRooms: MatrixRoom[] = Object.keys(communityMap).map(x => ({
      roomID: communityMap[x][0],
      isDirect: false,
    }));
    const dmRoomMap = await this.matrixRoomAdapterService.dmRooms(matrixClient);
    const dmRoomMapKeys = Object.keys(dmRoomMap);
    const dmRooms: MatrixRoom[] = dmRoomMapKeys.map(x => ({
      roomID: dmRoomMap[x][0],
      isDirect: true,
      receiverEmail: this.matrixUserAdapterService.id2email(x),
    }));

    return communityRooms.concat(dmRooms);
  }

  // async getCommunityRoom((
  //   matrixAgent: IMatrixAgent,
  //   roomId: string
  // ): Promise<MatrixRoom> {

  //   return {}
  // }

  async getRoom(
    matrixAgent: IMatrixAgent,
    roomId: string
  ): Promise<MatrixRoom> {
    const dmRoomMap = await this.matrixRoomAdapterService.dmRooms(
      matrixAgent.matrixClient
    );
    const dmRoomMapKeys = Object.keys(dmRoomMap);
    const dmRoom = dmRoomMapKeys.find(
      userID => dmRoomMap[userID].indexOf(roomId) !== -1
    );

    const room: MatrixRoom = await matrixAgent.matrixClient.getRoom(roomId);
    if (!room) {
      throw new MatrixEntityNotFoundException(
        `Room not found: ${roomId}, agent id: ${matrixAgent.matrixClient.getUserId()}`,
        LogContext.COMMUNICATION
      );
    }

    return {
      roomID: room.roomID,
      isDirect: Boolean(dmRoom),
      receiverEmail: dmRoom && this.matrixUserAdapterService.id2email(dmRoom),
      timeline: room.timeline,
    };
  }

  async getMessages(
    matrixAgent: IMatrixAgent,
    roomId: string
  ): Promise<MatrixRoom> {
    return await this.getRoom(matrixAgent, roomId);
  }

  async getUserMessages(
    matrixAgent: IMatrixAgent,
    email: string
  ): Promise<MatrixRoom> {
    const matrixUsername = this.matrixUserAdapterService.email2id(email);
    // Need to implement caching for performance
    const dmRoom = this.matrixRoomAdapterService.dmRooms(
      matrixAgent.matrixClient
    )[matrixUsername];

    // Check DMRoomMap implementation for details in react-sdk
    // avoid retrieving data - if we cannot retrieve dms for a room that is supposed to be dm then we might have reached an erroneous state
    if (!dmRoom || !Boolean(dmRoom[0])) {
      return {
        roomID: '',
      };
    }

    const targetRoomId = dmRoom[0];

    return await this.getMessages(matrixAgent, targetRoomId);
  }

  async getCommunityMessages(
    matrixAgent: IMatrixAgent,
    communityId: string
  ): Promise<MatrixRoom> {
    const communityRoomIds = this.matrixGroupAdapterService.communityRooms(
      matrixAgent.matrixClient
    )[communityId];
    if (!communityRoomIds) {
      return {
        roomID: '',
      };
    }
    const communityRoomId = communityRoomIds[0];

    const communityGroup = await matrixAgent.matrixClient.getGroup(
      communityRoomId
    );
    if (!communityGroup) {
      throw new MatrixEntityNotFoundException(
        `Group not found: ${communityRoomId}`,
        LogContext.COMMUNICATION
      );
    }

    return await this.getMessages(matrixAgent, communityGroup.roomId);
  }

  async initiateMessagingToUser(
    matrixAgent: IMatrixAgent,
    msgRequest: MatrixAgentMessageRequestDirect
  ): Promise<string> {
    const client = matrixAgent.matrixClient;
    // there needs to be caching for dmRooms and event to update them
    const dmRooms = this.matrixRoomAdapterService.dmRooms(client);
    const matrixId = this.matrixUserAdapterService.email2id(msgRequest.email);
    const dmRoom = dmRooms[matrixId];
    let targetRoomId = null;

    if (!dmRoom || !Boolean(dmRoom[0])) {
      targetRoomId = await this.matrixRoomAdapterService.createRoom(client, {
        dmUserId: matrixId,
      });

      await this.matrixRoomAdapterService.setDmRoom(
        client,
        targetRoomId,
        matrixId
      );
    } else {
      targetRoomId = dmRoom[0];
    }

    return targetRoomId;
  }

  async messageCommunity(
    matrixAgent: IMatrixAgent,
    msgRequest: MatrixAgentMessageRequestCommunity
  ): Promise<string> {
    const groupRooms = await matrixAgent.matrixClient.getGroupRooms(
      msgRequest.communityId
    );
    const room = groupRooms[0];

    if (room) {
      throw new Error('The community does not have a default room set');
    }

    await this.message(matrixAgent, room.roomId, { text: msgRequest.text });

    return room.roomId;
  }

  async message(
    matrixAgent: IMatrixAgent,
    roomId: string,
    msgRequest: MatrixAgentMessageRequest
  ) {
    await matrixAgent.matrixClient.sendEvent(
      roomId,
      'm.room.message',
      { body: msgRequest.text, msgtype: 'm.text' },
      ''
    );
  }
}
