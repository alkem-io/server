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
import { MatrixRoom } from '../adapter-room/matrix.room';
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

  async getCommunityRooms(matrixAgent: IMatrixAgent): Promise<MatrixRoom[]> {
    const matrixClient = matrixAgent.matrixClient;
    const rooms: MatrixRoom[] = [];

    // Community rooms
    const communityMap = await this.matrixGroupAdapterService.communityRoomsMap(
      matrixClient
    );
    for (const groupID of Object.keys(communityMap)) {
      const communityRoom = new MatrixRoom();
      communityRoom.roomId = communityMap[groupID][0];
      communityRoom.isDirect = false;
      rooms.push(communityRoom);
    }
    return rooms;
  }

  async getDirectRooms(matrixAgent: IMatrixAgent): Promise<MatrixRoom[]> {
    const matrixClient = matrixAgent.matrixClient;
    const rooms: MatrixRoom[] = [];

    // Direct rooms
    const dmRoomMap = await this.matrixRoomAdapterService.dmRooms(matrixClient);
    for (const userID of Object.keys(dmRoomMap)) {
      const directRoom = new MatrixRoom();
      directRoom.roomId = dmRoomMap[userID][0];
      directRoom.isDirect = true;
      directRoom.receiverEmail = this.matrixUserAdapterService.id2email(userID);
      rooms.push(directRoom);
    }
    return rooms;
  }

  async getRoom(
    matrixAgent: IMatrixAgent,
    roomId: string
  ): Promise<MatrixRoom> {
    const matrixRoom: MatrixRoom = await matrixAgent.matrixClient.getRoom(
      roomId
    );
    if (!matrixRoom) {
      throw new MatrixEntityNotFoundException(
        `Room not found: ${roomId}, agent id: ${matrixAgent.matrixClient.getUserId()}`,
        LogContext.COMMUNICATION
      );
    }
    return matrixRoom;
  }

  async initiateMessagingToUser(
    matrixAgent: IMatrixAgent,
    msgRequest: MatrixAgentMessageRequestDirect
  ): Promise<string> {
    const directRoom = await this.getDirectRoomForUserEmail(
      matrixAgent,
      msgRequest.email
    );
    if (directRoom) return directRoom.roomId;

    // Room does not exist, create...
    const matrixUsername = this.matrixUserAdapterService.email2id(
      msgRequest.email
    );

    const targetRoomId = await this.matrixRoomAdapterService.createRoom(
      matrixAgent.matrixClient,
      {
        dmUserId: matrixUsername,
      }
    );

    await this.matrixRoomAdapterService.setDmRoom(
      matrixAgent.matrixClient,
      targetRoomId,
      matrixUsername
    );

    return targetRoomId;
  }

  async getDirectRoomIdForRoomID(
    matrixAgent: MatrixAgent,
    matrixRoomId: string
  ): Promise<string | undefined> {
    // Need to implement caching for performance
    const dmRoomMap = await this.matrixRoomAdapterService.dmRooms(
      matrixAgent.matrixClient
    );
    const dmRoomMapKeys = Object.keys(dmRoomMap);
    const dmRoom = dmRoomMapKeys.find(
      userID => dmRoomMap[userID].indexOf(matrixRoomId) !== -1
    );
    return dmRoom;
  }

  async getDirectRoomForUserEmail(
    matrixAgent: IMatrixAgent,
    userEmail: string
  ): Promise<MatrixRoom | undefined> {
    const matrixUsername = this.matrixUserAdapterService.email2id(userEmail);
    // Need to implement caching for performance
    const dmRoomIds = this.matrixRoomAdapterService.dmRooms(
      matrixAgent.matrixClient
    )[matrixUsername];

    if (!dmRoomIds || !Boolean(dmRoomIds[0])) {
      return undefined;
    }

    // Have a result
    const targetRoomId = dmRoomIds[0];
    return await this.getRoom(matrixAgent, targetRoomId);
  }

  async messageCommunity(
    matrixAgent: IMatrixAgent,
    msgRequest: MatrixAgentMessageRequestCommunity
  ): Promise<string> {
    const rooms = await matrixAgent.matrixClient.getGroupRooms(
      msgRequest.communityId
    );
    const room = rooms[0];

    if (!room) {
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
