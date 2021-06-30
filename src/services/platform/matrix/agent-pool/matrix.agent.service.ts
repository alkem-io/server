import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes } from '@common/enums';
import { createClient } from 'matrix-js-sdk';
import {
  ICommunityMessageRequest,
  IInitiateDirectMessageRequest,
  IMessageRequest,
} from '@src/services/platform/matrix/agent-pool';
import { IMatrixAgent } from '@src/services/platform/matrix/agent-pool/matrix.agent.interface';
import { IOperationalMatrixUser } from '../user/matrix.user.interface';
import { MatrixUserAdapterService } from '../user/matrix.user.adapter.service';
import { MatrixAgent } from './matrix.agent';
import { MatrixClient } from '../types/matrix.client.type';
import { MatrixResponseMessage } from '../types/matrix.response.message.type';
import { MatrixRoom } from '../types/matrix.room.type';
import { MatrixRoomAdapterService } from '../adapter/matrix.room.adapter.service';
import { MatrixGroupAdapterService } from '../adapter/matrix.group.adapter.service';
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

  async getRooms(matrixAgent: IMatrixAgent): Promise<any[]> {
    const matrixClient = matrixAgent.matrixClient;
    const communityMap = await this.matrixGroupAdapterService.communityRooms(
      matrixClient
    );
    const communityRooms = Object.keys(communityMap).map(x => ({
      roomID: communityMap[x][0],
    }));
    const dmRoomMap = await this.matrixRoomAdapterService.dmRooms(matrixClient);
    const dmRooms = Object.keys(dmRoomMap).map(x => ({
      receiverEmail: this.matrixUserAdapterService.id2email(x),
      isDirect: true,
      roomID: dmRoomMap[x][0],
    }));

    return communityRooms.concat(dmRooms);
  }

  async getRoom(matrixAgent: IMatrixAgent, roomId: string): Promise<any> {
    const dmRoomMap = await this.matrixRoomAdapterService.dmRooms(
      matrixAgent.matrixClient
    );
    const dmRoomMapKeys = Object.keys(dmRoomMap);
    const dmRoom = dmRoomMapKeys.find(
      userID => dmRoomMap[userID].indexOf(roomId) !== -1
    );

    const room: MatrixRoom = await matrixAgent.matrixClient.getRoom(roomId);

    return {
      roomID: room.roomId,
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
  ): Promise<{
    roomId: string | null;
    name: string | null;
    timeline: MatrixResponseMessage[];
  }> {
    const matrixUsername = this.matrixUserAdapterService.email2id(email);
    // Need to implement caching for performance
    const dmRoom = this.matrixRoomAdapterService.dmRooms(
      matrixAgent.matrixClient
    )[matrixUsername];

    // Check DMRoomMap implementation for details in react-sdk
    // avoid retrieving data - if we cannot retrieve dms for a room that is supposed to be dm then we might have reached an erroneous state
    if (!dmRoom || !Boolean(dmRoom[0])) {
      return {
        roomId: null,
        name: null,
        timeline: [],
      };
    }

    const targetRoomId = dmRoom[0];

    return await this.getMessages(matrixAgent, targetRoomId);
  }

  async getCommunityMessages(
    matrixAgent: IMatrixAgent,
    communityId: string
  ): Promise<{
    roomId: string | null;
    name: string | null;
    timeline: MatrixResponseMessage[];
  }> {
    const communityRoomIds = this.matrixGroupAdapterService.communityRooms(
      matrixAgent.matrixClient
    )[communityId];
    if (!communityRoomIds) {
      return {
        roomId: null,
        name: null,
        timeline: [],
      };
    }
    const communityRoomId = communityRoomIds[0];

    const community = await matrixAgent.matrixClient.getGroup(communityRoomId);

    return await this.getMessages(matrixAgent, community.roomId);
  }

  async initiateMessagingToUser(
    matrixAgent: IMatrixAgent,
    content: IInitiateDirectMessageRequest
  ): Promise<string> {
    const client = matrixAgent.matrixClient;
    // there needs to be caching for dmRooms and event to update them
    const dmRooms = this.matrixRoomAdapterService.dmRooms(client);
    const matrixId = this.matrixUserAdapterService.email2id(content.email);
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
    content: ICommunityMessageRequest
  ): Promise<string> {
    const groupRooms = await matrixAgent.matrixClient.getGroupRooms(
      content.communityId
    );
    const room = groupRooms[0];

    if (room) {
      throw new Error('The community does not have a default room set');
    }

    await this.message(matrixAgent, room.roomId, { text: content.text });

    return room.roomId;
  }

  async message(
    matrixAgent: IMatrixAgent,
    roomId: string,
    content: IMessageRequest
  ) {
    await matrixAgent.matrixClient.sendEvent(
      roomId,
      'm.room.message',
      { body: content.text, msgtype: 'm.text' },
      ''
    );
  }
}
