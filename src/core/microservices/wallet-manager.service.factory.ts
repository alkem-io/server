import { LogContext } from '@common/enums';
import { MessagingQueue } from '@common/enums/messaging.queue';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { clientProxyFacotry } from './client.proxy.factory';

export async function walletManagerServiceFactory(
  logger: LoggerService,
  configService: ConfigService<AlkemioConfig, true>
): Promise<any> {
  try {
    const proxy = await clientProxyFacotry(
      configService,
      MessagingQueue.WALLET_MANAGER
    );
    return proxy;
  } catch (err) {
    logger.error(
      `Could not connect to RabbitMQ: ${err}, logging in...`,
      LogContext.NOTIFICATIONS
    );
    return undefined;
  }
}
