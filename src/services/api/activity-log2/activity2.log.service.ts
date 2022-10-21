import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ActivityLog2Input } from './dto/activity.log.dto.collaboration.input';
import { LogContext } from '@common/enums';
import { AgentInfo } from '@core/authentication/agent-info';
import { ActivityService } from '@src/platform/activity/activity.service';
import { IActivityLogEntry } from './dto/activity.log.entry.interface';
import { UserService } from '@domain/community/user/user.service';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { CommunityService } from '@domain/community/community/community.service';
import { IActivityLogEntryMemberJoined } from './dto/activity.log.dto.entry.member.joined.interface';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { IActivityLogEntryCalloutPublished } from './dto/activity.log.dto.entry.callout.published';
import { AspectService } from '@domain/collaboration/aspect/aspect.service';
import { IActivityLogEntryCalloutCardCreated } from './dto/activity.log.dto.entry.callout.card.created';

export class ActivityLog2Service {
  constructor(
    private activityService: ActivityService,
    private userService: UserService,
    private calloutService: CalloutService,
    private aspectService: AspectService,
    private communityService: CommunityService,
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
      const activityLogEntryBase = {
        id: rawActivity.id,
        triggeredBy: user,
        createdDate: rawActivity.createdDate,
        type: rawActivity.type,
        description: rawActivity.description,
        collaborationID: rawActivity.collaborationID,
      };
      switch (rawActivity.type) {
        case ActivityEventType.MEMBER_JOINED:
          const community = await this.communityService.getCommunityOrFail(
            rawActivity.parentID
          );
          const activityMemberJoined: IActivityLogEntryMemberJoined = {
            ...activityLogEntryBase,
            community: community,
          };
          results.push(activityMemberJoined);
          break;
        case ActivityEventType.CALLOUT_PUBLISHED:
          const callout = await this.calloutService.getCalloutOrFail(
            rawActivity.resourceID
          );
          const activityCalloutPublished: IActivityLogEntryCalloutPublished = {
            ...activityLogEntryBase,
            callout: callout,
          };
          results.push(activityCalloutPublished);
          break;
        case ActivityEventType.CARD_CREATED:
          const calloutCardCreated = await this.calloutService.getCalloutOrFail(
            rawActivity.parentID
          );
          const cardCreated = await this.aspectService.getAspectOrFail(
            rawActivity.resourceID
          );
          const activityCalloutCardCreated: IActivityLogEntryCalloutCardCreated =
            {
              ...activityLogEntryBase,
              callout: calloutCardCreated,
              card: cardCreated,
            };
          results.push(activityCalloutCardCreated);
          break;
        case ActivityEventType.CANVAS_CREATED:
        case ActivityEventType.CHALLENGE_CREATED:
        case ActivityEventType.OPPORTUNITY_CREATED:
        case ActivityEventType.CARD_COMMENT:
        case ActivityEventType.DISCUSSION_COMMENT:
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
    }
    return results;
  }
}
