import { Disposable } from '@interfaces/disposable.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMatrixAuthProviderConfig } from '@src/services/configuration/config/matrix';
import { IOperationalMatrixUser } from '@src/services/matrix/user/user.matrix.interface';
import { createClient } from 'matrix-js-sdk/lib';
import {
  ICommunityMessageRequest,
  IDirectMessageRequest,
  IMatrixCommunicationService,
  IResponseMessage,
} from './communication.matrix.interface';
import { MatrixGroupEntityAdapter } from './group/group.communication.matrix.adapter';
import { MatrixRoomEntityAdapter } from './room/room.communication.matrix.adapter';

type MatrixClient = {
  startClient: () => void;
  stopClient: () => void;
  getGroups: () => Promise<any[]>;
  getRooms: () => Promise<any[]>;
  getRoom: (roomId: string) => Promise<any>;
  getGroup: (groupId: string) => Promise<any>;
  sendEvent: (
    roomId: string,
    type: string,
    content: Record<string, any>,
    _: string
  ) => void;
};

@Injectable()
export class MatrixCommunicationService
  implements IMatrixCommunicationService, Disposable {
  private _config: IMatrixAuthProviderConfig;
  _matrixClient: MatrixClient;
  protected _roomEntityAdapter: MatrixRoomEntityAdapter;
  protected _groupEntityAdapter: MatrixGroupEntityAdapter;

  constructor(
    private configService: ConfigService,
    operator: IOperationalMatrixUser
  ) {
    this._config = this.configService.get<IMatrixAuthProviderConfig>(
      'matrix'
    ) as IMatrixAuthProviderConfig;

    if (!this._config || !this._config.baseUrl) {
      throw new Error('Matrix configuration is not provided');
    }

    this._matrixClient = createClient({
      baseUrl: this._config.baseUrl,
      idBaseUrl: this._config.idBaseUrl,
      userId: operator.username,
      accessToken: operator.accessToken,
    });

    this._roomEntityAdapter = new MatrixRoomEntityAdapter(this._matrixClient);
    this._groupEntityAdapter = new MatrixGroupEntityAdapter(this._matrixClient);

    // The client needs to start and catch-up before any methods are invoked
    this._matrixClient.startClient();
  }

  async getCommunities(): Promise<any[]> {
    return this._matrixClient.getGroups() || [];
  }

  async getRooms(): Promise<any[]> {
    return this._matrixClient.getRooms() || [];
  }

  async getMessages(
    roomId: string
  ): Promise<{ roomId: string; name: string; timeline: IResponseMessage[] }> {
    const room = await this._matrixClient.getRoom(roomId);
    return {
      roomId: room.roomId,
      name: room.name,
      timeline: room.timeline,
    };
  }

  async getUserMessages(
    userId: string
  ): Promise<{
    roomId: string | null;
    name: string | null;
    timeline: IResponseMessage[];
  }> {
    const username = userId;
    // Need to implement caching for performance
    const dmRoom = this._roomEntityAdapter.dmRooms()[username];

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

    return await this.getMessages(targetRoomId);
  }

  async getCommunityMessages(
    communityId: string
  ): Promise<{
    roomId: string | null;
    name: string | null;
    timeline: IResponseMessage[];
  }> {
    const communityRoomIds = this._groupEntityAdapter.communityRooms()[
      communityId
    ];
    if (!communityRoomIds) {
      return {
        roomId: null,
        name: null,
        timeline: [],
      };
    }
    const communityRoomId = communityRoomIds[0];

    const community = await this._matrixClient.getGroup(communityRoomId);

    return await this.getMessages(community.roomId);
  }

  async messageUser(content: IDirectMessageRequest): Promise<void> {
    // there needs to be caching for dmRooms and event to update them
    const dmRooms = this._roomEntityAdapter.dmRooms();
    const dmRoom = dmRooms[content.userId];
    let targetRoomId = null;

    if (!dmRoom || !Boolean(dmRoom[0])) {
      targetRoomId = await this._roomEntityAdapter.createRoom({
        dmUserId: content.userId,
      });

      await this._roomEntityAdapter.setDmRoom(targetRoomId, content.userId);
    } else {
      targetRoomId = dmRoom[0];
    }

    return this.message(targetRoomId, { text: content.text });
  }

  async messageCommunity(content: ICommunityMessageRequest): Promise<void> {
    // need to convert the community id to a room id
    return this.message(content.communityId, { text: content.text });
  }

  private async message(roomId: string, content: { text: string }) {
    return await this._matrixClient.sendEvent(
      roomId,
      'm.room.message',
      { body: content.text, msgtype: 'm.text' },
      ''
    );
  }

  dispose() {
    this._matrixClient.stopClient();
  }
}
