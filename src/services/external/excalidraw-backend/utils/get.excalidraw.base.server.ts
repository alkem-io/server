import http from 'http';
import { Namespace, Server as SocketIO } from 'socket.io';
import { Adapter } from 'socket.io-adapter';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@nestjs/common';
import {
  AlkemioErrorStatus,
  ConfigurationTypes,
  LogContext,
} from '@common/enums';
import { BaseException } from '@common/exceptions/base.exception';
import { SocketIoServer } from '../types/socket.io.server';

export const getExcalidrawBaseServerOrFail = (
  configService: ConfigService,
  logger: LoggerService,
  adapterFactory?: typeof Adapter | ((nsp: Namespace) => Adapter)
): SocketIoServer | never => {
  const port = configService.get(ConfigurationTypes.HOSTING).whiteboard_rt.port;

  if (!port) {
    throw new BaseException(
      'Port not provided!',
      LogContext.EXCALIDRAW_SERVER,
      AlkemioErrorStatus.EXCALIDRAW_SERVER_INIT
    );
  }

  const httpServer = http.createServer();

  try {
    httpServer.listen(port, () => {
      logger?.verbose?.(
        `Excalidraw http server listening on port: ${port}`,
        LogContext.EXCALIDRAW_SERVER
      );
    });
  } catch (e) {
    throw new BaseException(
      `Error when initializing Excalidraw http server: ${e}`,
      LogContext.EXCALIDRAW_SERVER,
      AlkemioErrorStatus.EXCALIDRAW_SERVER_INIT
    );
  }

  return (() => {
    try {
      return new SocketIO(httpServer, {
        transports: ['websocket'],
        allowEIO3: true,
        adapter: adapterFactory,
      });
    } catch (e) {
      throw new BaseException(
        `Error when initializing Excalidraw SocketIO server: ${e}`,
        LogContext.EXCALIDRAW_SERVER,
        AlkemioErrorStatus.EXCALIDRAW_SERVER_INIT
      );
    }
  })();
};
