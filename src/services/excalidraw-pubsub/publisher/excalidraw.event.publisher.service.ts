import { Inject, Injectable } from '@nestjs/common';
import { PubSubEngine } from 'graphql-subscriptions';
import { EXCALIDRAW_PUBSUB_PROVIDER } from '@common/constants';

type BasePayload = { roomID: string };
type RoomInitPayload = Record<string, unknown>; // todo
type RoomJoinPayload = BasePayload;
type NewUserPayload = BasePayload & {
  socketID: string; // socket of the new user
};
type RoomUserChangePayload = BasePayload & {
  socketIDs: Array<string>; // all sockets in the room
};
type ServerBroadcastPayload = BasePayload & {
  roomID: string;
  data: ArrayBuffer;
};

@Injectable()
export class ExcalidrawEventPublisherService {
  constructor(
    @Inject(EXCALIDRAW_PUBSUB_PROVIDER) private excalidrawPubSub: PubSubEngine
  ) {}

  public publishRoomInit(payload: RoomInitPayload) {
    this.excalidrawPubSub.publish('init-room', payload);
  }

  public publishJoinRoom(payload: RoomJoinPayload) {
    this.excalidrawPubSub.publish('join-room', payload);
  }

  public publishNewUser(payload: NewUserPayload) {
    this.excalidrawPubSub.publish('new-user', payload);
  }

  public publishRoomUserChange(payload: RoomUserChangePayload) {
    this.excalidrawPubSub.publish('room-user-change', payload);
  }

  public publishServerBroadcast(payload: ServerBroadcastPayload) {
    this.excalidrawPubSub.publish('server-broadcast', payload);
  }
}
