import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { APP_ID, EXCALIDRAW_PUBSUB_PROVIDER } from '@common/constants';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '@common/exceptions/base.exception';
import {
  DISCONNECT,
  DISCONNECTING,
  NEW_USER,
  ROOM_USER_CHANGE,
  SERVER_BROADCAST,
  SERVER_VOLATILE_BROADCAST,
} from '@services/external/excalidraw-backend/event.names';
import { BasePayload } from '../payloads';
import { BaseEvent } from '../events';
import { excalidrawEventFactory } from './excalidraw.event.factory';

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
          const instance = excalidrawEventFactory({
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
        throw new BaseException(
          `Exception while waiting for result: ${(e as Error).message}`,
          LogContext.EXCALIDRAW_SERVER,
          AlkemioErrorStatus.EXCALIDRAW_AMQP_RESULT_ERROR
        );
      }
    })();
  }
}
