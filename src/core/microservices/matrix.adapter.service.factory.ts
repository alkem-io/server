import { LogContext } from '@common/enums';
import { MessagingQueue } from '@common/enums/messaging.queue';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { clientProxyFacotry } from './clientProxyFactory';

export async function matrixAdapterServiceFactory(
  logger: LoggerService,
  configService: ConfigService<AlkemioConfig, true>
): Promise<any> {
  try {
    const proxy = await clientProxyFacotry(
      configService,
      MessagingQueue.MATRIX_ADAPTER
    );
    return proxy;
  } catch (err) {
    logger.error(
      `Could not connect to RabbitMQ: ${err}, logging in...`,
      LogContext.COMMUNICATION
    );
    return undefined;
  }
}
