import { AMQPPubSub } from 'graphql-amqp-subscriptions';
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
  BasePayload,
  RoomUserChangePayload,
  ServerVolatileBroadcastPayload,
} from '../payloads';
import { Subject } from 'rxjs';
import amqp from 'amqplib';

type SubjectType<TPayload> = {
  payload: TPayload;
  message?: amqp.ConsumeMessage | null;
};

const subscribableEvents = [
  NEW_USER,
  ROOM_USER_CHANGE,
  SERVER_BROADCAST,
  SERVER_VOLATILE_BROADCAST,
  DISCONNECTING,
  DISCONNECT,
];

@Injectable()
export class ExcalidrawEventSubscriberService {
  constructor(
    @Inject(EXCALIDRAW_PUBSUB_PROVIDER) private excalidrawPubSub: AMQPPubSub
  ) {}

  /***
   * Subscribes to all subscribable events and returns a subscription id
   * to be used to unsubscribe after
   * @param next
   * @returns Promise<Array<number>>
   */
  public subscribeToAll(
    next: (payload: BasePayload, message?: amqp.ConsumeMessage | null) => void
  ): Promise<Array<number>> {
    const promises = subscribableEvents.map(event =>
      this.excalidrawPubSub.subscribe(event, (content, message) => {
        // if the data is binary it's returned as
        // { type: 'Buffer', data: [...]
        content.data = content?.data.data ?? undefined;
        next(content, message);
      })
    );

    return Promise.all(promises);
  }

  public unsubscribe(subIds: Array<number>) {
    subIds.forEach(subId => this.excalidrawPubSub.unsubscribe(subId));
  }

  public subscribeServerVolatileBroadcast(
    next: (
      payload: ServerVolatileBroadcastPayload,
      message?: amqp.ConsumeMessage | null
    ) => void
  ) {
    const subject = new Subject<SubjectType<ServerVolatileBroadcastPayload>>();
    this.excalidrawPubSub.subscribe(
      SERVER_VOLATILE_BROADCAST,
      (payload, message) => {
        subject.next({
          payload,
          message,
        });
        next(payload, message);
      },
      {}
    );
    return subject.subscribe();
  }

  public subscribeRoomUserChange(
    next: (
      payload: ServerVolatileBroadcastPayload,
      message?: amqp.ConsumeMessage | null
    ) => void
  ) {
    const subject = new Subject<SubjectType<RoomUserChangePayload>>();
    this.excalidrawPubSub.subscribe(
      ROOM_USER_CHANGE,
      (payload, message) => {
        subject.next({
          payload,
          message,
        });
        next(payload, message);
      },
      {}
    );
    return subject.subscribe();
  }
}
