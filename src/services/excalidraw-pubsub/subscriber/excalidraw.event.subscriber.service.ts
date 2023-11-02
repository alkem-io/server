import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { APP_ID, EXCALIDRAW_PUBSUB_PROVIDER } from '@common/constants';
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
  ServerBroadcastPayload,
  ServerVolatileBroadcastPayload,
} from '../payloads';
import {
  BaseEvent,
  DisconnectedEvent,
  DisconnectingEvent,
  RoomUserChangeEvent,
  ServerBroadcastEvent,
  ServerVolatileBroadcastEvent,
} from '../events';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';

const subscribableEvents = [
  NEW_USER,
  ROOM_USER_CHANGE,
  SERVER_BROADCAST,
  SERVER_VOLATILE_BROADCAST,
  DISCONNECTING,
  DISCONNECT,
];
// the library used executes Buffer.toJSON
// on the received payload before passing it down to be consumed
type BaseReceivedPayload = BasePayload & {
  data?: ReturnType<Buffer['toJSON']>;
};

@Injectable()
export class ExcalidrawEventSubscriberService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(EXCALIDRAW_PUBSUB_PROVIDER) private excalidrawPubSub: AMQPPubSub,
    @Inject(APP_ID) private appId: string
  ) {}

  /***
   * Subscribes to all subscribable events and returns a subscription id
   * to be used to unsubscribe after
   * @param next
   * @returns Promise<Array<number>>
   */
  public subscribeToAll(next: (event: BaseEvent) => void) {
    // wrap in iife to avoid make the main function async
    (async () => {
      try {
        const asyncIterator =
          this.excalidrawPubSub.asyncIterator<BaseReceivedPayload>(
            subscribableEvents
          );
        while (true) {
          const { done, value } = await asyncIterator.next();
          if (done) {
            return;
          }
          if (value.publisherId === this.appId) {
            // skip the event if it's coming from the same publisher/service instance
            // events are handled by the ws server in the current instance
            continue;
          }
          const instance = createInstanceFromPayload({
            ...value,
            // parse the parsed value back to Buffer - see BaseReceivedPayload
            data: value.data && Buffer.from(value.data),
          });

          if (!instance) {
            this.logger.warn(
              `Could not instantiate event from payload: ${value}`,
              LogContext.EXCALIDRAW_SERVER
            );
            continue;
          }

          next(instance);
        }
      } catch (e) {
        throw new Error(
          `Exception while waiting for result: ${(e as Error).message}`
        );
      }
    })();
  }
}
// todo type
const createInstanceFromPayload = (
  payload: BasePayload
): BaseEvent | undefined => {
  switch (payload.name) {
    case DISCONNECT:
      return new DisconnectedEvent(payload.publisherId);
    case DISCONNECTING:
      return new DisconnectingEvent(payload.publisherId);
    case ROOM_USER_CHANGE: {
      const { roomID, publisherId, socketIDs } =
        payload as RoomUserChangePayload;
      return new RoomUserChangeEvent(roomID, socketIDs, publisherId);
    }
    case SERVER_BROADCAST: {
      const { roomID, publisherId, data } = payload as ServerBroadcastPayload;
      return new ServerBroadcastEvent(roomID, data, publisherId);
    }
    case SERVER_VOLATILE_BROADCAST: {
      const { roomID, publisherId, data } =
        payload as ServerVolatileBroadcastPayload;
      return new ServerVolatileBroadcastEvent(roomID, data, publisherId);
    }
    default:
      return undefined;
  }
};
