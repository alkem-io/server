import { Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InjectRepository } from '@nestjs/typeorm';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  CompressedInAppNotificationPayload,
  InAppNotificationPayload,
} from '@alkemio/notifications-lib';
import { LogContext } from '@common/enums';
import { InAppNotificationEntity } from '../in-app-notification/in.app.notification.entity';
import { InAppNotificationState } from '../in-app-notification/in.app.notification.state';

// todo: use this service in the controller
@Injectable()
export class InAppNotificationReceiver {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(InAppNotificationEntity)
    private readonly inAppNotificationRepo: Repository<InAppNotificationEntity>
  ) {}

  public async decompressAndStore(
    compressedPayload: CompressedInAppNotificationPayload[]
  ) {
    // decompress
    const notifications = compressedPayload.flatMap(x =>
      decompressInAppNotifications(x)
    );
    this.logger.verbose?.(
      `Decompressed ${notifications.length} in-app notifications`,
      LogContext.IN_APP_NOTIFICATION
    );
    // store
    return this.store(notifications);
  }

  private async store(
    notifications: InAppNotificationPayload[]
  ): Promise<void> {
    const entities = notifications.map(notification =>
      InAppNotificationEntity.create({
        triggeredAt: notification.triggeredAt,
        type: notification.type,
        state: InAppNotificationState.UNREAD,
        category: notification.category,
        receiverID: notification.receiverID,
        triggeredByID: notification.triggeredByID,
        payload: notification,
      })
    );
    await this.inAppNotificationRepo.save(entities, {
      chunk: 100,
    });
    return;
  }
}

const decompressInAppNotifications = (
  data: CompressedInAppNotificationPayload
): InAppNotificationPayload[] => {
  const { receiverIDs, ...rest } = data;
  return receiverIDs.map(receiverID => ({
    ...rest,
    receiverID,
  }));
};
