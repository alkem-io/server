import { Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InjectRepository } from '@nestjs/typeorm';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  CompressedInAppNotificationPayload,
  InAppNotificationPayload,
} from '@alkemio/notifications-lib';
import { LogContext } from '@common/enums';
import { PlatformRoleService } from '@platform/platform.role/platform.role.service';
import { PlatformRole } from '@common/enums/platform.role';
import { InAppNotificationEntity } from '../in-app-notification/in.app.notification.entity';
import { InAppNotificationState } from '../in-app-notification/in.app.notification.state';

@Injectable()
export class InAppNotificationReceiver {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(InAppNotificationEntity)
    private readonly inAppNotificationRepo: Repository<InAppNotificationEntity>,
    private platformRoleService: PlatformRoleService
  ) {}

  public async decompressAndStore(
    compressedPayload: CompressedInAppNotificationPayload<InAppNotificationPayload>[]
  ) {
    // decompress
    const notifications = compressedPayload.flatMap(x =>
      decompressInAppNotifications(x)
    );
    this.logger.verbose?.(
      `Decompressed ${notifications.length} in-app notifications`,
      LogContext.IN_APP_NOTIFICATION
    );
    // filter out notifications that are not for beta users
    const receiverSet = new Set(
      notifications.map(({ receiverID }) => receiverID)
    );
    // get all beta tester receivers
    const betaTesterReceivers: string[] = [];
    const usersWithRoles =
      await this.platformRoleService.getPlatformRolesForUsers(
        Array.from(receiverSet)
      );
    for (const userID in usersWithRoles) {
      const roles = usersWithRoles[userID];
      if (roles.includes(PlatformRole.BETA_TESTER)) {
        betaTesterReceivers.push(userID);
      }
    }
    const notificationsForBetaUsers: InAppNotificationPayload[] =
      notifications.filter(x => betaTesterReceivers.includes(x.receiverID));
    // store
    this.logger.verbose?.(
      `Storing ${notificationsForBetaUsers.length} in-app notifications for beta users only`,
      LogContext.IN_APP_NOTIFICATION
    );
    return this.store(notificationsForBetaUsers);
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
  data: CompressedInAppNotificationPayload<InAppNotificationPayload>
): InAppNotificationPayload[] => {
  const { receiverIDs, triggeredAt, ...rest } = data;
  return receiverIDs.map(receiverID => ({
    ...rest,
    triggeredAt: new Date(triggeredAt),
    receiverID,
  }));
};
