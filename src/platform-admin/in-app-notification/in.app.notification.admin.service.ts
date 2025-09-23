import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PruneInAppNotificationAdminResult } from './dto/in.app.notification.admin.dto.prune.result';
import { InAppNotification } from '@platform/in-app-notification/in.app.notification.entity';
import { Repository, LessThan } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';

@Injectable()
export class InAppNotificationAdminService {
  constructor(
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(InAppNotification)
    private readonly inAppNotificationRepo: Repository<InAppNotification>
  ) {}

  async pruneInAppNotifications(): Promise<PruneInAppNotificationAdminResult> {
    // Time period to retain in-app notifications. Notifications older than this will be removed during pruning
    const retentionDays = this.configService.get(
      'notifications.in_app.max_retention_period_days',
      { infer: true }
    );
    // Maximum number of in-app notifications any user can have
    // When a user exceeds this limit, the oldest notifications will be removed
    const maxPerUser = this.configService.get(
      'notifications.in_app.max_notifications_per_user',
      { infer: true }
    );

    // Validate config to avoid destructive pruning
    if (!Number.isInteger(retentionDays) || retentionDays <= 0) {
      throw new ValidationException(
        'Invalid notifications.in_app.max_retention_period_days',
        LogContext.IN_APP_NOTIFICATION
      );
    }
    if (!Number.isInteger(maxPerUser) || maxPerUser <= 0) {
      throw new ValidationException(
        'Invalid notifications.in_app.max_notifications_per_user',
        LogContext.IN_APP_NOTIFICATION
      );
    }
    this.logger.verbose?.(
      `Starting pruning of in-app notifications: a) older than ${retentionDays} days b) max per user ${maxPerUser}`,
      LogContext.IN_APP_NOTIFICATION
    );

    // Calculate the cutoff date - notifications older than this will be removed
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      // Remove all notifications older than the cutoff date
      const deleteResult = await this.inAppNotificationRepo.delete({
        triggeredAt: LessThan(cutoffDate),
      });

      const removedCountOutsideRetentionPeriod = deleteResult.affected || 0;

      this.logger.verbose?.(
        `Successfully pruned ${removedCountOutsideRetentionPeriod} in-app notifications older than ${cutoffDate.toISOString()}`
      );

      // Now remove excess notifications per user (keeping only the most recent ones)
      const removedCountExceedingUserLimit =
        await this.pruneExcessNotificationsPerUser(maxPerUser);

      this.logger.verbose?.(
        `Successfully pruned ${removedCountExceedingUserLimit} in-app notifications exceeding user limit of ${maxPerUser}`
      );

      return {
        removedCountOutsideRetentionPeriod,
        removedCountExceedingUserLimit,
      };
    } catch (error) {
      this.logger.error(
        `Failed to prune in-app notifications: ${error}`,
        'InAppNotificationAdminService.pruneInAppNotifications'
      );
      throw error;
    }
  }

  /**
   * Remove excess notifications per user, keeping only the most recent ones
   * @returns The number of notifications removed
   */
  private async pruneExcessNotificationsPerUser(
    maxPerUser: number
  ): Promise<number> {
    this.logger.verbose?.(
      `Starting pruning of excess notifications per user (max: ${maxPerUser})`
    );

    try {
      // Get all users who have more than the maximum allowed notifications
      const usersWithExcessNotifications = await this.inAppNotificationRepo
        .createQueryBuilder('notification')
        .select('notification.receiverID', 'receiverID')
        .addSelect('COUNT(*)', 'count')
        .groupBy('notification.receiverID')
        .having('COUNT(*) > :maxNotifications', {
          maxNotifications: maxPerUser,
        })
        .getRawMany();

      let totalRemovedCount = 0;

      // For each user with excess notifications, remove the oldest ones
      for (const user of usersWithExcessNotifications) {
        const receiverID = user.receiverID;
        const excessCount = parseInt(user.count) - maxPerUser;

        if (excessCount > 0) {
          // Get the IDs of the oldest notifications for this user
          const oldestNotifications = await this.inAppNotificationRepo
            .createQueryBuilder('notification')
            .select('notification.id')
            .where('notification.receiverID = :receiverID', { receiverID })
            .orderBy('notification.triggeredAt', 'ASC')
            .limit(excessCount)
            .getMany();

          if (oldestNotifications.length > 0) {
            const idsToDelete = oldestNotifications.map(n => n.id);

            const deleteResult =
              await this.inAppNotificationRepo.delete(idsToDelete);
            const removedForUser = deleteResult.affected || 0;
            totalRemovedCount += removedForUser;

            this.logger.verbose?.(
              `Removed ${removedForUser} excess notifications for user ${receiverID}`
            );
          }
        }
      }

      return totalRemovedCount;
    } catch (error) {
      this.logger.error(
        `Failed to prune excess notifications per user: ${error}`,
        'InAppNotificationAdminService.pruneExcessNotificationsPerUser'
      );
      throw error;
    }
  }
}
