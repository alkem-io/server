import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ActivityLogInput } from './dto/activity.log.dto.collaboration.input';
import { LogContext } from '@common/enums';
import { AgentInfo } from '@core/authentication/agent-info';
import { ActivityService } from '@src/platform/activity/activity.service';
import { IActivityLogEntry } from './dto/activity.log.entry.interface';
import { UserService } from '@domain/community/user/user.service';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { CommunityService } from '@domain/community/community/community.service';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { AspectService } from '@domain/collaboration/aspect/aspect.service';
import { CanvasService } from '@domain/common/canvas/canvas.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { IActivity } from '@platform/activity';
import ActivityLogBuilderService, {
  IActivityLogBuilder,
} from '@services/api/activity-log/activity.log.builder.service';
import { IActivityLogEntryBase } from '@services/api/activity-log/activity.log.entry.base.interface';

export class ActivityLogService {
  constructor(
    private activityService: ActivityService,
    private userService: UserService,
    private calloutService: CalloutService,
    private aspectService: AspectService,
    private canvasService: CanvasService,
    private challengeService: ChallengeService,
    private opportunityService: OpportunityService,
    private communityService: CommunityService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async activityLog(
    queryData: ActivityLogInput,
    agentInfo: AgentInfo
  ): Promise<IActivityLogEntry[]> {
    this.logger.verbose?.(
      `Querying activityLog by user ${
        agentInfo.userID
      } + terms: ${JSON.stringify(queryData)}`,
      LogContext.ACTIVITY
    );

    let rawActivities: IActivity[] = [];
    if (queryData && queryData.collaborationID) {
      rawActivities = await this.activityService.getAllActivityForCollaboration(
        queryData.collaborationID
      );
    } else {
      rawActivities = await this.activityService.getAllActivity();
    }
    const results: IActivityLogEntry[] = await Promise.all(
      rawActivities.map(async rawActivity => {
        const userTriggeringActivity = await this.userService.getUserOrFail(
          rawActivity.triggeredBy
        );
        const activityLogEntryBase: IActivityLogEntryBase = {
          id: rawActivity.id,
          triggeredBy: userTriggeringActivity,
          createdDate: rawActivity.createdDate,
          type: rawActivity.type,
          description: rawActivity.description,
          collaborationID: rawActivity.collaborationID,
        };
        const activityBuilder = new ActivityLogBuilderService(
          activityLogEntryBase,
          this.activityService,
          this.userService,
          this.calloutService,
          this.aspectService,
          this.canvasService,
          this.challengeService,
          this.opportunityService,
          this.communityService
        ) as IActivityLogBuilder;
        const activityType = rawActivity.type as ActivityEventType;
        return activityBuilder[activityType](rawActivity);
      })
    );
    return results;
  }
}
