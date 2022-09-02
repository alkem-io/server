import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ActivityLogInput } from './dto/activity.log.dto.input';
import { LogContext } from '@common/enums';
import { AgentInfo } from '@core/authentication/agent-info';
import { IActivity } from '@src/platform/activity/activity.interface';
import { ActivityService } from '@src/platform/activity/activity.service';

export class ActivityLogService {
  constructor(
    private activityService: ActivityService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async activityLog(
    activityLogData: ActivityLogInput,
    agentInfo: AgentInfo
  ): Promise<IActivity[]> {
    this.logger.verbose?.(
      `Querying activityLog by user ${
        agentInfo.userID
      } + terms: ${JSON.stringify(activityLogData)}`,
      LogContext.ACTIVITY
    );
    const activityEntries = await this.activityService.getAllActivity();
    return activityEntries;
  }
}
