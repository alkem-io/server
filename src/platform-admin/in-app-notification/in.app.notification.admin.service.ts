import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PruneInAppNotificationAdminResult } from './dto/in.app.notification.admin.dto.prune.result';
import { InAppNotification } from '@platform/in-app-notification/in.app.notification.entity';
import { Repository, LessThan } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class InAppNotificationAdminService {
  // Time period to retain in-app notifications. Notifications older than this will be removed during pruning
  // TODO: this needs to come from platform configuration
  private static readonly NOTIFICATION_RETENTION_DAYS = 30;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(InAppNotification)
    private readonly inAppNotificationRepo: Repository<InAppNotification>
  ) {}

  async pruneInAppNotifications(): Promise<PruneInAppNotificationAdminResult> {
    this.logger.verbose?.(
      `Starting pruning of in-app notifications older than ${InAppNotificationAdminService.NOTIFICATION_RETENTION_DAYS} days`
    );

    // Calculate the cutoff date - notifications older than this will be removed
    const cutoffDate = new Date();
    cutoffDate.setDate(
      cutoffDate.getDate() -
        InAppNotificationAdminService.NOTIFICATION_RETENTION_DAYS
    );

    try {
      // Remove all notifications older than the cutoff date
      const deleteResult = await this.inAppNotificationRepo.delete({
        triggeredAt: LessThan(cutoffDate),
      });

      const removedCountOutsideRetentionPeriod = deleteResult.affected || 0;

      this.logger.verbose?.(
        `Successfully pruned ${removedCountOutsideRetentionPeriod} in-app notifications older than ${cutoffDate.toISOString()}`
      );

      return {
        removedCountOutsideRetentionPeriod,
      };
    } catch (error) {
      this.logger.error(
        `Failed to prune in-app notifications: ${error}`,
        'InAppNotificationAdminService.pruneInAppNotifications'
      );
      throw error;
    }

    //
  }
}
