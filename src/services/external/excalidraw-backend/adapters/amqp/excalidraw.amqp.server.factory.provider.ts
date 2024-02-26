import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FactoryProvider, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_ID, EXCALIDRAW_SERVER } from '@constants/index';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { ExcalidrawEventPublisherService } from '@services/excalidraw-pubsub/publisher';
import { ExcalidrawEventSubscriberService } from '@services/excalidraw-pubsub/subscriber';
import {
  CONNECTION,
  DISCONNECT,
  DISCONNECTING,
  INIT_ROOM,
  JOIN_ROOM,
  SERVER_BROADCAST,
  SERVER_VOLATILE_BROADCAST,
} from '../../types/event.names';
import { getExcalidrawBaseServerOrFail } from '../../utils/get.excalidraw.base.server';
import { SocketIoServer } from '../../types/socket.io.server';
import {
  disconnectEventAmqpHandler,
  disconnectingEventAmqpHandler,
  joinRoomEventAmqpHandler,
  serverBroadcastEventAmqpHandler,
  serverVolatileBroadcastEventAmqpHandler,
} from './handlers';

export const ExcalidrawAmqpServerFactoryProvider: FactoryProvider = {
  provide: EXCALIDRAW_SERVER,
  inject: [
    APP_ID,
    WINSTON_MODULE_NEST_PROVIDER,
    ConfigService,
    AuthenticationService,
    ExcalidrawEventPublisherService,
    ExcalidrawEventSubscriberService,
  ],
  useFactory: async (
    appId: string,
    logger: LoggerService,
    configService: ConfigService,
    excalidrawEventPublisher: ExcalidrawEventPublisherService,
    excalidrawEventSubscriber: ExcalidrawEventSubscriberService
  ) =>
    factory(
      appId,
      logger,
      configService,
      excalidrawEventPublisher,
      excalidrawEventSubscriber
    ),
};

const factory = async (
  appId: string,
  logger: LoggerService,
  configService: ConfigService,
  excalidrawEventPublisher: ExcalidrawEventPublisherService,
  excalidrawEventSubscriber: ExcalidrawEventSubscriberService
): Promise<SocketIoServer> | never => {
  const wsServer = getExcalidrawBaseServerOrFail(configService, logger);
  // subscribe to the state of other server instances
  // events from other servers ONLY
  excalidrawEventSubscriber.subscribeToAll(event =>
    event.handleEvent(wsServer)
  );
  // special events related to AMQP "adapter"
  wsServer.on(CONNECTION, async socket => {
    wsServer.to(socket.id).emit(INIT_ROOM);
    // client events ONLY
    socket.on(
      JOIN_ROOM,
      async (roomID: string) =>
        await joinRoomEventAmqpHandler(
          roomID,
          wsServer,
          excalidrawEventPublisher
        )
    );

    socket.on(SERVER_BROADCAST, (roomID: string, data: ArrayBuffer) =>
      serverBroadcastEventAmqpHandler(roomID, data, excalidrawEventPublisher)
    );

    socket.on(SERVER_VOLATILE_BROADCAST, (roomID: string, data: ArrayBuffer) =>
      serverVolatileBroadcastEventAmqpHandler(
        roomID,
        data,
        excalidrawEventPublisher
      )
    );

    socket.on(
      DISCONNECTING,
      async () =>
        await disconnectingEventAmqpHandler(
          wsServer,
          socket,
          excalidrawEventPublisher
        )
    );

    socket.on(DISCONNECT, () =>
      disconnectEventAmqpHandler(excalidrawEventPublisher)
    );
  });

  return wsServer;
};
