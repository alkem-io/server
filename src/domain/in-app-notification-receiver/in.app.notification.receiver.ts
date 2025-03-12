import { Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InjectRepository } from '@nestjs/typeorm';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  CompressedInAppNotificationPayload,
  InAppNotificationPayload,
} from '@alkemio/notifications-lib';
import { LogContext } from '@common/enums';
import { RoleName } from '@common/enums/role.name';
import { InAppNotificationEntity } from '../in-app-notification/in.app.notification.entity';
import { InAppNotificationState } from '../in-app-notification/in.app.notification.state';
import { PlatformService } from '@platform/platform/platform.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';

@Injectable()
export class InAppNotificationReceiver {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private platformService: PlatformService,
    private roleSetService: RoleSetService,
    private subscriptionPublishService: SubscriptionPublishService,
    @InjectRepository(InAppNotificationEntity)
    private readonly inAppNotificationRepo: Repository<InAppNotificationEntity>
  ) {}

  public async decompressStoreNotify(
    compressedPayload: CompressedInAppNotificationPayload<InAppNotificationPayload>[]
  ) {
    this.logger.verbose?.(
      `Received ${compressedPayload.length} compressed in-app notifications`,
      LogContext.IN_APP_NOTIFICATION
    );
    // decompress
    const notifications = compressedPayload.flatMap(x =>
      decompressInAppNotifications(x)
    );
    this.logger.verbose?.(
      `Decompressed ${notifications.length} in-app notifications`,
      LogContext.IN_APP_NOTIFICATION
    );
    // filter out notifications that are not for beta users
    const notificationsForBetaUsers =
      await this.filterOutNotificationsForBetaUsers(notifications);
    // store
    this.logger.verbose?.(
      `Storing ${notificationsForBetaUsers.length} in-app notifications for beta users only`,
      LogContext.IN_APP_NOTIFICATION
    );
    const savedNotifications = await this.store(notificationsForBetaUsers);
    // notify
    this.logger.verbose?.(
      'Notifying beta users about the received in-app notifications',
      LogContext.IN_APP_NOTIFICATION
    );
    savedNotifications.forEach(x =>
      this.subscriptionPublishService.publishInAppNotificationReceived(x)
    );
  }

  private async store(
    notifications: InAppNotificationPayload[]
  ): Promise<InAppNotificationEntity[]> {
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
    return this.inAppNotificationRepo.save(entities, {
      chunk: 100,
    });
  }

  private async filterOutNotificationsForBetaUsers(
    notifications: InAppNotificationPayload[]
  ): Promise<InAppNotificationPayload[]> {
    const receiverSet = new Set(
      notifications.map(({ receiverID }) => receiverID)
    );
    // get all beta tester receivers
    const betaTesterReceivers: string[] = [];
    const platformRoleSet = await this.platformService.getRoleSetOrFail();
    const usersWithRoles = await this.roleSetService.getRolesForUsers(
      platformRoleSet,
      Array.from(receiverSet)
    );
    for (const userID in usersWithRoles) {
      const roles = usersWithRoles[userID];
      if (roles.includes(RoleName.PLATFORM_BETA_TESTER)) {
        betaTesterReceivers.push(userID);
      }
    }
    return notifications.filter(x =>
      betaTesterReceivers.includes(x.receiverID)
    );
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
