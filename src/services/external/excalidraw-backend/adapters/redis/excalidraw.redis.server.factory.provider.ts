import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { FactoryProvider, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  AlkemioErrorStatus,
  ConfigurationTypes,
  LogContext,
} from '@common/enums';
import { BaseException } from '@common/exceptions/base.exception';
import { APP_ID, EXCALIDRAW_SERVER } from '@constants/index';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WhiteboardService } from '@domain/common/whiteboard';
import { getExcalidrawBaseServerOrFail } from '../../utils/get.excalidraw.base.server';
import { AlkemioConfig } from '@src/types';

export const ExcalidrawRedisServerFactoryProvider: FactoryProvider = {
  provide: EXCALIDRAW_SERVER,
  inject: [
    APP_ID,
    WINSTON_MODULE_NEST_PROVIDER,
    ConfigService,
    AuthenticationService,
    AuthorizationService,
    WhiteboardService,
  ],
  useFactory: async (
    appId: string,
    logger: LoggerService,
    configService: ConfigService<AlkemioConfig, true>
  ) => factory(appId, logger, configService),
};

const factory = async (
  appId: string,
  logger: LoggerService,
  configService: ConfigService<AlkemioConfig, true>
) => {
  const { host, port } = configService.get(ConfigurationTypes.STORAGE).redis;

  if (!host) {
    throw new BaseException(
      'Redis host is not defined!',
      LogContext.EXCALIDRAW_SERVER,
      AlkemioErrorStatus.EXCALIDRAW_REDIS_ADAPTER_INIT
    );
  }

  if (!port) {
    throw new BaseException(
      'Redis port is not defined!',
      LogContext.EXCALIDRAW_SERVER,
      AlkemioErrorStatus.EXCALIDRAW_REDIS_ADAPTER_INIT
    );
  }

  const redisAdapterFactory = (() => {
    try {
      const pubClient = createClient({
        url: `redis://${host}:${port}`,
        max_attempts: 25,
        socket_keepalive: true,
        disable_resubscribing: false,
        enable_offline_queue: true,
        retry_unfulfilled_commands: true,
      });
      const subClient = pubClient.duplicate();
      pubClient.on('error', (error: Error) =>
        logger.error(error.message, error.stack, LogContext.EXCALIDRAW_SERVER)
      );
      subClient.on('error', (error: Error) =>
        logger.error(error.message, error.stack, LogContext.EXCALIDRAW_SERVER)
      );
      return createAdapter(pubClient, subClient, {
        requestsTimeout: 10000,
        key: appId,
      });
    } catch (error) {
      throw new BaseException(
        'Error while initializing Redis adapter',
        LogContext.EXCALIDRAW_SERVER,
        AlkemioErrorStatus.EXCALIDRAW_REDIS_ADAPTER_INIT
      );
    }
  })();

  return getExcalidrawBaseServerOrFail(
    configService,
    logger,
    redisAdapterFactory
  );
};
