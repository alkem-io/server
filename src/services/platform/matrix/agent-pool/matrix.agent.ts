import { ConfigurationTypes } from '@common/enums';
import { Disposable } from '@interfaces/disposable.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IOperationalMatrixUser } from '@src/services/platform/matrix/management/matrix.management.user.interface';
import { createClient } from 'matrix-js-sdk';
import { MatrixTransforms } from '@src/services/platform/matrix/management/matrix.management.user.service';
import {
  IMatrixEventHandler,
  MatrixEventDispatcher,
} from '@src/services/platform/matrix/events/matrix.event.dispatcher';
import { AutoAcceptGroupMembershipMonitorFactory } from '@src/services/platform/matrix/events/matrix.event.adapter.group';
import { AutoAcceptRoomMembershipMonitorFactory } from '@src/services/platform/matrix/events/matrix.event.adpater.room';
import { MatrixGroupEntityAdapter } from '@src/services/platform/matrix/adapter/matrix.adapter.group';
import { MatrixClient } from '@src/services/platform/matrix/agent-pool/matrix.client.types';
import { MatrixRoomEntityAdapter } from '@src/services/platform/matrix/adapter/matrix.adapter.room';
import {
  ICommunityMessageRequest,
  IDirectMessageRequest,
  IMatrixAgent,
  IMessageRequest,
  IResponseMessage,
} from '@src/services/platform/matrix/agent-pool';

@Injectable()
export class MatrixAgent implements IMatrixAgent, Disposable {
  idBaseUrl: string;
  baseUrl: string;

  _matrixClient: MatrixClient;
  protected _roomEntityAdapter: MatrixRoomEntityAdapter;
  protected _groupEntityAdapter: MatrixGroupEntityAdapter;
  protected _eventDispatcher: MatrixEventDispatcher;

  constructor(
    private configService: ConfigService,
    operator: IOperationalMatrixUser
  ) {
    this.idBaseUrl = this.configService.get(
      ConfigurationTypes.Communications
    )?.matrix?.server?.name;
    this.baseUrl = this.configService.get(
      ConfigurationTypes.Communications
    )?.matrix?.server?.name;

    if (!this.idBaseUrl || !this.baseUrl) {
      throw new Error('Matrix configuration is not provided');
    }

    this._matrixClient = createClient({
      baseUrl: this.baseUrl,
      idBaseUrl: this.idBaseUrl,
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
