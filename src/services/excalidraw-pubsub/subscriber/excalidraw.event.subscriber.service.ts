import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import { Inject, Injectable } from '@nestjs/common';
import { APP_ID, EXCALIDRAW_PUBSUB_PROVIDER } from '@common/constants';
import {
  DISCONNECT,
  DISCONNECTING,
  NEW_USER,
  ROOM_USER_CHANGE,
  SERVER_BROADCAST,
  SERVER_VOLATILE_BROADCAST,
} from '@services/external/excalidraw-backend/event.names';
import { BasePayload } from '../payloads';

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
    @Inject(EXCALIDRAW_PUBSUB_PROVIDER) private excalidrawPubSub: AMQPPubSub,
    @Inject(APP_ID) private appId: string
  ) {}

  /***
   * Subscribes to all subscribable events and returns a subscription id
   * to be used to unsubscribe after
   * @param next
   * @returns Promise<Array<number>>
   */
  public async subscribeToAll(next: (payload: BasePayload) => void) {
    // todo; simplify; breakdown
    try {
      const asyncIterator =
        this.excalidrawPubSub.asyncIterator<any /*BasePayload*/>( // todo
          subscribableEvents
        );
      while (true) {
        const { done, value } = await asyncIterator.next();
        if (done) {
          return;
        }
        value.data = value?.data && new Uint8Array(value.data.data).buffer;
        next(value);
      }
    } catch (e) {
      throw new Error(
        `Exception while waiting for result: ${(e as Error).message}`
      );
    }
  }
}
