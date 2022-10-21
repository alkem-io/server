import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ActivityLog2Input } from './dto/activity.log.dto.collaboration.input';
import { LogContext } from '@common/enums';
import { AgentInfo } from '@core/authentication/agent-info';
import { ActivityService } from '@src/platform/activity/activity.service';
import { IActivityLogEntry } from './dto/activity.log.entry.interface';
import { UserService } from '@domain/community/user/user.service';

export class ActivityLog2Service {
  constructor(
    private activityService: ActivityService,
    private userService: UserService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async activityLog(
    queryData: ActivityLog2Input,
    agentInfo: AgentInfo
  ): Promise<IActivityLogEntry[]> {
    this.logger.verbose?.(
      `Querying activityLog by user ${
        agentInfo.userID
      } + terms: ${JSON.stringify(queryData)}`,
      LogContext.ACTIVITY
    );

    let rawActivities = [];
    if (queryData && queryData.collaborationID) {
      rawActivities = await this.activityService.getAllActivityForCollaboration(
        queryData.collaborationID
      );
    } else {
      rawActivities = await this.activityService.getAllActivity();
    }
    const results: IActivityLogEntry[] = [];
    for (const rawActivity of rawActivities) {
      const user = await this.userService.getUserOrFail(
        rawActivity.triggeredBy
      );
      const activity: IActivityLogEntry = {
        id: rawActivity.id,
        triggeredBy: user,
        createdDate: rawActivity.createdDate,
        type: rawActivity.type,
        description: rawActivity.description,
        collaborationID: rawActivity.collaborationID,
      };
      results.push(activity);
    }
    return results;
  }
}
