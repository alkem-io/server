import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ActivityLogInput } from './dto/activity.log.dto.collaboration.input';
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
    queryData: ActivityLogInput,
    agentInfo: AgentInfo
  ): Promise<IActivity[]> {
    this.logger.verbose?.(
      `Querying activityLog by user ${
        agentInfo.userID
      } + terms: ${JSON.stringify(queryData)}`,
      LogContext.ACTIVITY
    );

    if (queryData && queryData.collaborationID) {
      return await this.activityService.getAllActivityForCollaboration(
        queryData.collaborationID
      );
    } else {
      return await this.activityService.getAllActivity();
    }
  }
}
