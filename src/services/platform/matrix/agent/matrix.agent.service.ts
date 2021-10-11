import { ConfigurationTypes, LogContext } from '@common/enums';
import { MatrixEntityNotFoundException } from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PUB_SUB } from '@services/platform/subscription/subscription.module';
import { createClient, IContent } from 'matrix-js-sdk';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixGroupAdapterService } from '../adapter-group/matrix.group.adapter.service';
import { MatrixRoom } from '../adapter-room/matrix.room';
import { MatrixRoomAdapterService } from '../adapter-room/matrix.room.adapter.service';
import { MatrixUserAdapterService } from '../adapter-user/matrix.user.adapter.service';
import { IOperationalMatrixUser } from '../adapter-user/matrix.user.interface';
import { MatrixClient } from '../types/matrix.client.type';
import { MatrixAgent } from './matrix.agent';
import { MatrixAgentMessageRequest } from './matrix.agent.dto.message.request';
import { MatrixAgentMessageRequestDirect } from './matrix.agent.dto.message.request.direct';
import { IMatrixAgent } from './matrix.agent.interface';
import { PubSubEngine } from 'graphql-subscriptions';

@Injectable()
export class MatrixAgentService {
  constructor(
    private configService: ConfigService,
    private matrixUserAdapterService: MatrixUserAdapterService,
    private matrixRoomAdapterService: MatrixRoomAdapterService,
    private matrixGroupAdapterService: MatrixGroupAdapterService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(PUB_SUB)
    private readonly subscriptionHandler: PubSubEngine
  ) {}

  async createMatrixAgent(
    operator: IOperationalMatrixUser
  ): Promise<MatrixAgent> {
    const matrixClient = await this.createMatrixClient(operator);
    return new MatrixAgent(
      matrixClient,
      this.matrixRoomAdapterService,
      this.matrixUserAdapterService,
      this.subscriptionHandler,
      this.logger
    );
  }

  async createMatrixClient(
    operator: IOperationalMatrixUser
  ): Promise<MatrixClient> {
    const idBaseUrl = this.configService.get(ConfigurationTypes.COMMUNICATIONS)
      ?.matrix?.server?.url;
    const baseUrl = this.configService.get(ConfigurationTypes.COMMUNICATIONS)
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
      const roomIds = communityMap[groupID] || [];

      for (const roomId of roomIds) {
        try {
          const room = await this.getRoom(matrixAgent, roomId);
          room.isDirect = false;
          rooms.push(room);
        } catch (error) {
          // We can cause a lot of damage with the exception thrown in getRoom
          // There are cases where the room exists but the user is not yet invited to it.
          // Because of one missing room the user might not be able to access none of them.
          // Need to decide on an approach
          this.logger.warn(
            `A room with ID [${roomId}] is not longer present. This might be due to erroneous state.`,
            LogContext.COMMUNICATION
          );
        }
      }
    }
    return rooms;
  }

  async getDirectRooms(matrixAgent: IMatrixAgent): Promise<MatrixRoom[]> {
    const matrixClient = matrixAgent.matrixClient;
    const rooms: MatrixRoom[] = [];

    // Direct rooms
    const dmRoomMap =
      await this.matrixRoomAdapterService.getDirectMessageRoomsMap(
        matrixClient
      );
    for (const matrixUsername of Object.keys(dmRoomMap)) {
      const room = await this.getRoom(
        matrixAgent,
        dmRoomMap[matrixUsername][0]
      );
      room.receiverCommunicationsID =
        this.matrixUserAdapterService.convertMatrixUsernameToMatrixId(
          matrixUsername
        );
      room.isDirect = true;
      rooms.push(room);
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
    messageRequest: MatrixAgentMessageRequestDirect
  ): Promise<string> {
    const directRoom = await this.getDirectRoomForCommunicationsID(
      matrixAgent,
      messageRequest.matrixID
    );
    if (directRoom) return directRoom.roomId;

    // Room does not exist, create...
    const matrixUsername = this.matrixUserAdapterService.convertEmailToMatrixId(
      messageRequest.matrixID
    );

    const targetRoomId = await this.matrixRoomAdapterService.createRoom(
      matrixAgent.matrixClient,
      {
        dmUserId: matrixUsername,
      }
    );

    await this.matrixRoomAdapterService.storeDirectMessageRoom(
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
    const dmRoomMap =
      await this.matrixRoomAdapterService.getDirectMessageRoomsMap(
        matrixAgent.matrixClient
      );
    const dmRoomMapKeys = Object.keys(dmRoomMap);
    const dmRoom = dmRoomMapKeys.find(
      userID => dmRoomMap[userID].indexOf(matrixRoomId) !== -1
    );
    return dmRoom;
  }

  async getDirectRoomForCommunicationsID(
    matrixAgent: IMatrixAgent,
    communicationsID: string
  ): Promise<MatrixRoom | undefined> {
    const matrixUsername =
      this.matrixUserAdapterService.convertCommunicationsIdToUsername(
        communicationsID
      );
    // Need to implement caching for performance
    const dmRoomIds = this.matrixRoomAdapterService.getDirectMessageRoomsMap(
      matrixAgent.matrixClient
    )[matrixUsername];

    if (!dmRoomIds || !Boolean(dmRoomIds[0])) {
      return undefined;
    }

    // Have a result
    const targetRoomId = dmRoomIds[0];
    return await this.getRoom(matrixAgent, targetRoomId);
  }

  async sendMessage(
    matrixAgent: IMatrixAgent,
    roomId: string,
    messageRequest: MatrixAgentMessageRequest
  ) {
    const response = await matrixAgent.matrixClient.sendEvent(
      roomId,
      'm.room.message',
      { body: messageRequest.text, msgtype: 'm.text' },
      ''
    );

    return response.event_id;
  }

  // TODO - see if the js sdk supports message aggregation
  async editMessage(
    matrixAgent: IMatrixAgent,
    roomId: string,
    messageId: string,
    messageRequest: MatrixAgentMessageRequest
  ) {
    const newContent: IContent = {
      msgtype: 'm.text',
      body: messageRequest.text,
    };
    await matrixAgent.matrixClient.sendMessage(
      roomId,
      Object.assign(
        {
          'm.new_content': newContent,
          'm.relates_to': {
            rel_type: 'm.replace',
            event_id: messageId,
          },
        },
        newContent
      )
    );

    // const response = await matrixAgent.matrixClient.sendEvent(
    //   roomId,
    //   'm.replace',
    //   {
    //     body: messageRequest.text,
    //     msgtype: 'm.text',
    //   }
    // );

    // need to find a way to retrieve the correct content for the event
    // const replacementMessage = await matrixAgent.matrixClient.fetchRoomEvent(
    //   roomId,
    //   response.event_id
    // );
  }

  async deleteMessage(
    matrixAgent: IMatrixAgent,
    roomId: string,
    messageId: string
  ) {
    await matrixAgent.matrixClient.redactEvent(roomId, messageId);
  }
}
