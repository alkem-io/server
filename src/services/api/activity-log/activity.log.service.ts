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
import { IActivityLogEntryMemberJoined } from './dto/activity.log.dto.entry.member.joined.interface';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { IActivityLogEntryCalloutPublished } from './dto/activity.log.dto.entry.callout.published';
import { AspectService } from '@domain/collaboration/aspect/aspect.service';
import { IActivityLogEntryCalloutCardCreated } from './dto/activity.log.dto.entry.callout.card.created';
import { CanvasService } from '@domain/common/canvas/canvas.service';
import { IActivityLogEntryCalloutCanvasCreated } from './dto/activity.log.dto.entry.callout.canvas.created';
import { IActivityLogEntryCalloutDiscussionComment } from './dto/activity.log.dto.entry.callout.discussion.comment';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { IActivityLogEntryChallengeCreated } from './dto/activity.log.dto.entry.challenge.created';
import { IActivityLogEntryOpportunityCreated } from './dto/activity.log.dto.entry.opportunity.created';

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
      const userTriggeringActivity = await this.userService.getUserOrFail(
        rawActivity.triggeredBy
      );
      const activityLogEntryBase = {
        id: rawActivity.id,
        triggeredBy: userTriggeringActivity,
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
          const userJoining = await this.userService.getUserOrFail(
            rawActivity.resourceID
          );
          const activityMemberJoined: IActivityLogEntryMemberJoined = {
            ...activityLogEntryBase,
            community: community,
            user: userJoining,
            communityType: `${community.type}`,
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
          const calloutCanvasCreated =
            await this.calloutService.getCalloutOrFail(rawActivity.parentID);
          const canvasCreated = await this.canvasService.getCanvasOrFail(
            rawActivity.resourceID
          );
          const activityCalloutCanvasCreated: IActivityLogEntryCalloutCanvasCreated =
            {
              ...activityLogEntryBase,
              callout: calloutCanvasCreated,
              canvas: canvasCreated,
            };
          results.push(activityCalloutCanvasCreated);
          break;
        case ActivityEventType.CHALLENGE_CREATED:
          const challenge = await this.challengeService.getChallengeOrFail(
            rawActivity.resourceID
          );
          const activityChallengeCreated: IActivityLogEntryChallengeCreated = {
            ...activityLogEntryBase,
            challenge: challenge,
          };
          results.push(activityChallengeCreated);
          break;
        case ActivityEventType.OPPORTUNITY_CREATED:
          const opportunity =
            await this.opportunityService.getOpportunityOrFail(
              rawActivity.resourceID
            );
          const activityOpportunityCreated: IActivityLogEntryOpportunityCreated =
            {
              ...activityLogEntryBase,
              opportunity: opportunity,
            };
          results.push(activityOpportunityCreated);
          break;
        case ActivityEventType.CARD_COMMENT:
          const calloutCardComment = await this.calloutService.getCalloutOrFail(
            rawActivity.parentID
          );
          const cardCommentedOn = await this.aspectService.getAspectOrFail(
            rawActivity.resourceID
          );
          const activityCalloutCardCommentedOn: IActivityLogEntryCalloutCardCreated =
            {
              ...activityLogEntryBase,
              callout: calloutCardComment,
              card: cardCommentedOn,
            };
          results.push(activityCalloutCardCommentedOn);
          break;
        case ActivityEventType.DISCUSSION_COMMENT:
          const calloutDiscussionComment =
            await this.calloutService.getCalloutOrFail(rawActivity.resourceID);
          const activityCalloutDiscussionComment: IActivityLogEntryCalloutDiscussionComment =
            {
              ...activityLogEntryBase,
              callout: calloutDiscussionComment,
            };
          results.push(activityCalloutDiscussionComment);
      }
    }
    return results;
  }
}
