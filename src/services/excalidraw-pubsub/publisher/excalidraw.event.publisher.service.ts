import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import { Inject, Injectable } from '@nestjs/common';
import { APP_ID, EXCALIDRAW_PUBSUB_PROVIDER } from '@common/constants';
import {
  DISCONNECT,
  DISCONNECTING,
  ROOM_USER_CHANGE,
  SERVER_BROADCAST,
  SERVER_VOLATILE_BROADCAST,
} from '@services/external/excalidraw-backend/types/event.names';
import {
  BasePayload,
  DisconnectedPayload,
  DisconnectingPayload,
  RoomUserChangePayload,
  ServerBroadcastPayload,
  ServerVolatileBroadcastPayload,
} from '../payloads';

@Injectable()
export class ExcalidrawEventPublisherService {
  constructor(
    @Inject(EXCALIDRAW_PUBSUB_PROVIDER) private excalidrawPubSub: AMQPPubSub,
    @Inject(APP_ID) private appId: string
  ) {}

  public publishRoomUserChange(payload: RoomUserChangePayload) {
    this.excalidrawPubSub.publish(ROOM_USER_CHANGE, {
      ...payload,
      publisherId: payload.publisherId ?? this.appId,
      name: ROOM_USER_CHANGE,
    });
  }

  public publishServerBroadcast(payload: ServerBroadcastPayload) {
    this.excalidrawPubSub.publish(SERVER_BROADCAST, {
      ...payload,
      publisherId: payload.publisherId ?? this.appId,
      name: SERVER_BROADCAST,
    });
  }

  public publishServerVolatileBroadcast(
    payload: ServerVolatileBroadcastPayload
  ) {
    this.excalidrawPubSub.publish(SERVER_VOLATILE_BROADCAST, {
      ...payload,
      publisherId: payload.publisherId ?? this.appId,
      name: SERVER_VOLATILE_BROADCAST,
    });
  }

  public publishDisconnecting(payload: DisconnectingPayload) {
    this.excalidrawPubSub.publish(DISCONNECTING, {
      ...payload,
      publisherId: payload.publisherId ?? this.appId,
      name: DISCONNECTING,
    });
  }

  public publishDisconnected(payload: DisconnectedPayload) {
    this.excalidrawPubSub.publish(
      DISCONNECT,
      this.formatPayload(DISCONNECT, payload)
    );
  }
  // todo: use everywhere
  private formatPayload(event: string, payload: BasePayload) {
    return {
      ...payload,
      publisherId: payload.publisherId ?? this.appId,
      name: event,
    };
  }
}
