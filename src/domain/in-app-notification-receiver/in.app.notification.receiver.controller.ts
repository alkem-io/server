import { InAppNotificationPayloadBase } from '@alkemio/notifications-lib';
import { Controller, Inject, LoggerService } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { ack } from '@services/util';
import { InAppNotificationReceiver } from './in.app.notification.receiver';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Controller()
export class InAppNotificationReceiverController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly inAppNotificationReceiver: InAppNotificationReceiver
  ) {}
  @EventPattern('in-app-notification-incoming', Transport.RMQ)
  public receive(
    @Payload()
    data: InAppNotificationPayloadBase,
    @Ctx() context: RmqContext
  ) {
    this.logger.verbose?.(
      `Received ${data.receiverIDs.length} compressed in-app notifications`
    );
    ack(context);
    this.inAppNotificationReceiver.decompressStoreNotify(data);
  }
}
