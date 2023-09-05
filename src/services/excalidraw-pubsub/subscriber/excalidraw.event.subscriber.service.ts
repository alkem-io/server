import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import { Inject, Injectable } from '@nestjs/common';
import { EXCALIDRAW_PUBSUB_PROVIDER } from '@common/constants';
import {
  ROOM_USER_CHANGE,
  SERVER_VOLATILE_BROADCAST,
} from '@services/external/excalidraw-backend/event.names';
import { RoomJoinPayload, RoomUserChangePayload, ServerVolatileBroadcastPayload } from '../types';

@Injectable()
export class ExcalidrawEventSubscriberService {
  constructor(
    @Inject(EXCALIDRAW_PUBSUB_PROVIDER) private excalidrawPubSub: AMQPPubSub
  ) {}

  public subscribeServerVolatileBroadcast() {
    this.excalidrawPubSub.subscribe(
      SERVER_VOLATILE_BROADCAST,
      (payload: ServerVolatileBroadcastPayload) => {
        console.log(payload.roomID, payload.name);
      },
      {}
    );
  }

  public subscribeRoomUserChange() {
    this.excalidrawPubSub.subscribe(
      ROOM_USER_CHANGE,
      (payload: RoomUserChangePayload) => {
        console.log(payload.roomID, payload.name, payload.socketIDs);
      },
      {}
    );
  }
}
