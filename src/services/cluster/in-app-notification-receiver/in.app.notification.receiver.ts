import { Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InjectRepository } from '@nestjs/typeorm';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InAppNotificationPayloadBase } from '@alkemio/notifications-lib';
import { LogContext } from '@common/enums';
import { RoleName } from '@common/enums/role.name';
import { InAppNotificationEntity } from '../../../platform/in-app-notification/in.app.notification.entity';
import { InAppNotificationState } from '../../../platform/in-app-notification/enums/in.app.notification.state';
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
    notification: InAppNotificationPayloadBase
  ) {
    if (!notification.receiverIDs || notification.receiverIDs.length === 0) {
      this.logger.error(
        'Received in-app notification with no receiver IDs, skipping storage.',
        LogContext.IN_APP_NOTIFICATION
      );
      return;
    }
    const receiverIDs = notification.receiverIDs;
    this.logger.verbose?.(
      `Received ${receiverIDs?.length} compressed in-app notifications`,
      LogContext.IN_APP_NOTIFICATION
    );

    // filter out notifications that are not for beta users
    const receiversBetaUsers =
      await this.filterOutNotificationsForBetaUsers(receiverIDs);
    // store
    this.logger.verbose?.(
      `Storing ${receiversBetaUsers?.length} in-app notifications for beta users only`,
      LogContext.IN_APP_NOTIFICATION
    );
    const savedNotifications = await this.store(
      notification,
      receiversBetaUsers
    );
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
    notification: InAppNotificationPayloadBase,
    receiverIDs: string[]
  ): Promise<InAppNotificationEntity[]> {
    const entities = receiverIDs.map(receiverID =>
      InAppNotificationEntity.create({
        triggeredAt: notification.triggeredAt,
        type: notification.type,
        state: InAppNotificationState.UNREAD,
        category: notification.category,
        receiverID: receiverID,
        triggeredByID: notification.triggeredByID,
        payload: notification,
      })
    );
    return this.inAppNotificationRepo.save(entities, {
      chunk: 100,
    });
  }

  private async filterOutNotificationsForBetaUsers(
    receiverIDs: string[]
  ): Promise<string[]> {
    // get all beta tester receivers
    const betaTesterReceivers: string[] = [];
    const platformRoleSet = await this.platformService.getRoleSetOrFail();
    const usersWithRoles = await this.roleSetService.getRolesForUsers(
      platformRoleSet,
      Array.from(receiverIDs)
    );
    for (const userID in usersWithRoles) {
      const roles = usersWithRoles[userID];
      if (roles.includes(RoleName.PLATFORM_BETA_TESTER)) {
        betaTesterReceivers.push(userID);
      }
    }
    return receiverIDs.filter(x => betaTesterReceivers.includes(x));
  }
}
