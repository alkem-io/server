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
import ActivityLogBuilderService, {
  IActivityLogBuilder,
} from '@services/api/activity-log/activity.log.builder.service';
import { IActivity } from '@platform/activity/activity.interface';

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

    // Get all raw activities; limit is used to determine the amount of results
    const rawActivities =
      await this.activityService.getActivityForCollaboration(
        queryData.collaborationID
      );

    // Convert results until have enough
    const results: IActivityLogEntry[] = [];
    for (const rawActivity of rawActivities) {
      if (!queryData.limit || queryData.limit > results.length) {
        const result = await this.convertRawActivityToResult(rawActivity);
        if (result) {
          results.push(result);
        }
        if (queryData.limit && results.length >= queryData.limit) {
          break;
        }
      }
    }
    return results;
  }

  private async convertRawActivityToResult(
    rawActivity: IActivity
  ): Promise<IActivityLogEntry | undefined> {
    try {
      // Work around for community member joined without parentID set
      if (
        rawActivity.type === ActivityEventType.MEMBER_JOINED &&
        !rawActivity.parentID
      ) {
        return undefined;
      }

      const userTriggeringActivity = await this.userService.getUserOrFail(
        rawActivity.triggeredBy
      );
      const activityLogEntryBase: IActivityLogEntry = {
        id: rawActivity.id,
        triggeredBy: userTriggeringActivity,
        createdDate: rawActivity.createdDate,
        type: rawActivity.type,
        description: rawActivity.description,
        collaborationID: rawActivity.collaborationID,
      };
      const activityBuilder: IActivityLogBuilder =
        new ActivityLogBuilderService(
          activityLogEntryBase,
          this.userService,
          this.calloutService,
          this.aspectService,
          this.canvasService,
          this.challengeService,
          this.opportunityService,
          this.communityService
        );
      const activityType = rawActivity.type as ActivityEventType;
      const result = await activityBuilder[activityType](rawActivity);
      return result;
    } catch (error) {
      //
      this.logger.warn(
        `Unable to process activity entry ${rawActivity.id}: ${error}`,
        LogContext.ACTIVITY
      );
    }
  }
}
