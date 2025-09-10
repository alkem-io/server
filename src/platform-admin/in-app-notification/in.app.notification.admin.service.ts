import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PruneInAppNotificationAdminResult } from './dto/in.app.notification.admin.dto.prune.result';

@Injectable()
export class InAppNotificationAdminService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async pruneInAppNotifications(): Promise<PruneInAppNotificationAdminResult> {
    // TODO: Implement pruning logic
    this.logger.log('Pruning in-app notifications - not yet implemented');
    return {
      removedCount: 0,
    };
  }
}
