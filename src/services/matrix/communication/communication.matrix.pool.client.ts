import { Disposable } from '@interfaces/disposable.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMatrixAuthProviderConfig } from '@src/services/configuration/config/matrix';
import { IOperationalMatrixUser } from '@src/services/matrix/user/user.matrix.interface';
import { createClient } from 'matrix-js-sdk';
import { MatrixTransforms } from '../user/user.matrix.service';
import {
  IMatrixEventHandler,
  MatrixEventDispatcher,
} from './communication.event.dispatcher';
import {
  ICommunityMessageRequest,
  IDirectMessageRequest,
  IMatrixCommunicationClient,
  IMessageRequest,
  IResponseMessage,
} from './communication.matrix.interface';
import { AutoAcceptGroupMembershipMonitorFactory } from './events/group.events.communication.matrix';
import { AutoAcceptRoomMembershipMonitorFactory } from './events/room.events.communication.matrix';
import { MatrixGroupEntityAdapter } from './group/group.communication.matrix.adapter';
import { MatrixClient } from './matrix.types';
import { MatrixRoomEntityAdapter } from './room/room.communication.matrix.adapter';

@Injectable()
export class MatrixCommunicationClient
  implements IMatrixCommunicationClient, Disposable {
  private _config: IMatrixAuthProviderConfig;
  _matrixClient: MatrixClient;
  protected _roomEntityAdapter: MatrixRoomEntityAdapter;
  protected _groupEntityAdapter: MatrixGroupEntityAdapter;
  protected _eventDispatcher: MatrixEventDispatcher;

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
    this._eventDispatcher = new MatrixEventDispatcher(this._matrixClient);
  }

  async getCommunities(): Promise<any[]> {
    return this._matrixClient.getGroups() || [];
  }

  async getRooms(): Promise<any[]> {
    const communityMap = await this._groupEntityAdapter.communityRooms();
    const communityRooms = Object.keys(communityMap).map(x => ({
      roomID: communityMap[x][0],
    }));
    const dmRoomMap = await this._roomEntityAdapter.dmRooms();
    const dmRooms = Object.keys(dmRoomMap).map(x => ({
      receiverEmail: MatrixTransforms.id2email(x),
      isDirect: true,
      roomID: dmRoomMap[x][0],
    }));

    return communityRooms.concat(dmRooms);
  }

  async getRoom(roomId: string): Promise<any> {
    const dmRoomMap = await this._roomEntityAdapter.dmRooms();
    const dmRoom = Object.keys(dmRoomMap).find(
      userID => dmRoomMap[userID].indexOf(roomId) !== -1
    );

    const room = await this._matrixClient.getRoom(roomId);

    return {
      roomID: room.roomId,
      isDirect: Boolean(dmRoom),
      receiverEmail: dmRoom && MatrixTransforms.id2email(dmRoom),
      timeline: room.timeline,
    };
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
    email: string
  ): Promise<{
    roomId: string | null;
    name: string | null;
    timeline: IResponseMessage[];
  }> {
    const matrixUsername = MatrixTransforms.email2id(email);
    // Need to implement caching for performance
    const dmRoom = this._roomEntityAdapter.dmRooms()[matrixUsername];

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

  async messageUser(content: IDirectMessageRequest): Promise<string> {
    // there needs to be caching for dmRooms and event to update them
    const dmRooms = this._roomEntityAdapter.dmRooms();
    const matrixId = MatrixTransforms.email2id(content.email);
    const dmRoom = dmRooms[matrixId];
    let targetRoomId = null;

    if (!dmRoom || !Boolean(dmRoom[0])) {
      targetRoomId = await this._roomEntityAdapter.createRoom({
        dmUserId: matrixId,
      });

      await this._roomEntityAdapter.setDmRoom(targetRoomId, matrixId);
    } else {
      targetRoomId = dmRoom[0];
    }

    await this.message(targetRoomId, { text: content.text });

    return targetRoomId;
  }

  async messageCommunity(content: ICommunityMessageRequest): Promise<string> {
    const groupRooms = await this._matrixClient.getGroupRooms(
      content.communityId
    );
    const room = groupRooms[0];

    if (room) {
      throw new Error('The community does not have a default room set');
    }

    await this.message(room.roomId, { text: content.text });

    return room.roomId;
  }

  async message(roomId: string, content: IMessageRequest) {
    await this._matrixClient.sendEvent(
      roomId,
      'm.room.message',
      { body: content.text, msgtype: 'm.text' },
      ''
    );
  }

  attach(handler: IMatrixEventHandler) {
    this._eventDispatcher.attach(handler);
  }

  detach(id: string) {
    this._eventDispatcher.detach(id);
  }

  async start() {
    const startComplete = new Promise<void>((resolve, reject) => {
      const subscription = this._eventDispatcher.syncMonitor.subscribe(
        ({ oldSyncState, syncState }) => {
          if (syncState === 'SYNCING' && oldSyncState !== 'SYNCING') {
            subscription.unsubscribe();
            resolve();
          } else if (syncState === 'ERROR') {
            reject();
          }
        }
      );
    });

    this.attach({
      id: 'root',
      roomMemberMembershipMonitor: AutoAcceptRoomMembershipMonitorFactory.create(
        this._matrixClient,
        this._roomEntityAdapter
      ),
      groupMyMembershipMonitor: AutoAcceptGroupMembershipMonitorFactory.create(
        this._matrixClient
      ),
    });

    await this._matrixClient.startClient();

    return await startComplete;
  }

  dispose() {
    this._matrixClient.stopClient();
    this._eventDispatcher.dispose();
  }
}
