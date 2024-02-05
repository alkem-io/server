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
import { WhiteboardRtService } from '@domain/common/whiteboard-rt';
import { getExcalidrawBaseServerOrFail } from '../../utils/get.excalidraw.base.server';

export const ExcalidrawRedisServerFactoryProvider: FactoryProvider = {
  provide: EXCALIDRAW_SERVER,
  inject: [
    APP_ID,
    WINSTON_MODULE_NEST_PROVIDER,
    ConfigService,
    AuthenticationService,
    AuthorizationService,
    WhiteboardRtService,
  ],
  useFactory: async (
    appId: string,
    logger: LoggerService,
    configService: ConfigService
  ) => factory(appId, logger, configService),
};

const factory = async (
  appId: string,
  logger: LoggerService,
  configService: ConfigService
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
      const pubClient = createClient({ url: `redis://${host}:${port}` });
      const subClient = pubClient.duplicate();
      return createAdapter(pubClient, subClient);
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
