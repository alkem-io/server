import { PubSubEngine } from 'graphql-subscriptions';
import { Inject, Injectable } from '@nestjs/common';
import { EXCALIDRAW_PUBSUB_PROVIDER } from '@common/constants';
import {
  DISCONNECT,
  DISCONNECTING,
  NEW_USER,
  ROOM_USER_CHANGE,
  SERVER_BROADCAST,
  SERVER_VOLATILE_BROADCAST,
} from '@services/external/excalidraw-backend/event.names';
import {
  DisconnectedPayload,
  DisconnectingPayload,
  NewUserPayload,
  RoomUserChangePayload,
  ServerBroadcastPayload,
  ServerVolatileBroadcastPayload,
} from '../types';

@Injectable()
export class ExcalidrawEventPublisherService {
  constructor(
    @Inject(EXCALIDRAW_PUBSUB_PROVIDER) private excalidrawPubSub: PubSubEngine
  ) {}

  public publishNewUser(payload: NewUserPayload) {
    this.excalidrawPubSub.publish(NEW_USER, {
      ...payload,
      name: NEW_USER,
    });
  }

  public publishRoomUserChange(payload: RoomUserChangePayload) {
    this.excalidrawPubSub.publish(ROOM_USER_CHANGE, {
      ...payload,
      name: ROOM_USER_CHANGE,
    });
  }

  public publishServerBroadcast(payload: ServerBroadcastPayload) {
    this.excalidrawPubSub.publish(SERVER_BROADCAST, {
      ...payload,
      name: SERVER_BROADCAST,
    });
  }

  public publishServerVolatileBroadcast(
    payload: ServerVolatileBroadcastPayload
  ) {
    this.excalidrawPubSub.publish(SERVER_VOLATILE_BROADCAST, {
      ...payload,
      name: SERVER_VOLATILE_BROADCAST,
    });
  }

  public publishDisconnecting(payload: DisconnectingPayload) {
    this.excalidrawPubSub.publish(DISCONNECTING, {
      ...payload,
      name: DISCONNECTING,
    });
  }

  public publishDisconnected(payload: DisconnectedPayload) {
    this.excalidrawPubSub.publish(DISCONNECT, {
      ...payload,
      name: DISCONNECT,
    });
  }
}
