import { IActivity } from '@platform/activity';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { IActivityLogEntryMemberJoined } from '@services/api/activity-log/dto/activity.log.dto.entry.member.joined.interface';
import { IActivityLogEntryCalloutPublished } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.published';
import { IActivityLogEntryCalloutCardCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.card.created';
import { IActivityLogEntryCalloutCanvasCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.canvas.created';
import { IActivityLogEntryChallengeCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.challenge.created';
import { IActivityLogEntryOpportunityCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.opportunity.created';
import { IActivityLogEntryCalloutCardComment } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.card.comment';
import { IActivityLogEntryCalloutDiscussionComment } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.discussion.comment';
import { UserService } from '@domain/community/user/user.service';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { AspectService } from '@domain/collaboration/aspect/aspect.service';
import { CanvasService } from '@domain/common/canvas/canvas.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { CommunityService } from '@domain/community/community/community.service';
import { IActivityLogEntry } from './dto/activity.log.entry.interface';
import { IActivityLogEntryUpdateSent } from './dto/activity.log.dto.entry.update.sent';
import { UpdatesService } from '@domain/communication/updates/updates.service';

interface ActivityLogBuilderFunction<TypedActivityLogEntry> {
  (rawActivity: IActivity): Promise<TypedActivityLogEntry>;
}

export interface IActivityLogBuilder {
  [ActivityEventType.MEMBER_JOINED]: ActivityLogBuilderFunction<IActivityLogEntryMemberJoined>;
  [ActivityEventType.CALLOUT_PUBLISHED]: ActivityLogBuilderFunction<IActivityLogEntryCalloutPublished>;
  [ActivityEventType.CARD_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryCalloutCardCreated>;
  [ActivityEventType.CANVAS_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryCalloutCanvasCreated>;
  [ActivityEventType.CHALLENGE_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryChallengeCreated>;
  [ActivityEventType.OPPORTUNITY_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryOpportunityCreated>;
  [ActivityEventType.CARD_COMMENT]: ActivityLogBuilderFunction<IActivityLogEntryCalloutCardComment>;
  [ActivityEventType.DISCUSSION_COMMENT]: ActivityLogBuilderFunction<IActivityLogEntryCalloutDiscussionComment>;
  [ActivityEventType.UPDATE_SENT]: ActivityLogBuilderFunction<IActivityLogEntryUpdateSent>;
}

export default class ActivityLogBuilderService implements IActivityLogBuilder {
  constructor(
    private readonly activityLogEntryBase: IActivityLogEntry,
    private readonly userService: UserService,
    private readonly calloutService: CalloutService,
    private readonly aspectService: AspectService,
    private readonly canvasService: CanvasService,
    private readonly challengeService: ChallengeService,
    private readonly opportunityService: OpportunityService,
    private readonly communityService: CommunityService,
    private readonly updatesService: UpdatesService
  ) {}

  async [ActivityEventType.MEMBER_JOINED](rawActivity: IActivity) {
    const community = await this.communityService.getCommunityOrFail(
      rawActivity.parentID
    );
    const userJoining = await this.userService.getUserOrFail(
      rawActivity.resourceID
    );
    const activityMemberJoined: IActivityLogEntryMemberJoined = {
      ...this.activityLogEntryBase,
      community: community,
      user: userJoining,
      communityType: `${community.type}`,
    };
    return activityMemberJoined;
  }

  async [ActivityEventType.CALLOUT_PUBLISHED](rawActivity: IActivity) {
    const callout = await this.calloutService.getCalloutOrFail(
      rawActivity.resourceID
    );
    const activityCalloutPublished: IActivityLogEntryCalloutPublished = {
      ...this.activityLogEntryBase,
      callout: callout,
    };
    return activityCalloutPublished;
  }

  async [ActivityEventType.CARD_CREATED](rawActivity: IActivity) {
    const calloutCardCreated = await this.calloutService.getCalloutOrFail(
      rawActivity.parentID
    );
    const cardCreated = await this.aspectService.getAspectOrFail(
      rawActivity.resourceID
    );
    const activityCalloutCardCreated: IActivityLogEntryCalloutCardCreated = {
      ...this.activityLogEntryBase,
      callout: calloutCardCreated,
      card: cardCreated,
    };
    return activityCalloutCardCreated;
  }

  async [ActivityEventType.CANVAS_CREATED](rawActivity: IActivity) {
    const calloutCanvasCreated = await this.calloutService.getCalloutOrFail(
      rawActivity.parentID
    );
    const canvasCreated = await this.canvasService.getCanvasOrFail(
      rawActivity.resourceID
    );
    const activityCalloutCanvasCreated: IActivityLogEntryCalloutCanvasCreated =
      {
        ...this.activityLogEntryBase,
        callout: calloutCanvasCreated,
        canvas: canvasCreated,
      };
    return activityCalloutCanvasCreated;
  }

  async [ActivityEventType.CHALLENGE_CREATED](rawActivity: IActivity) {
    const challenge = await this.challengeService.getChallengeOrFail(
      rawActivity.resourceID
    );
    const activityChallengeCreated: IActivityLogEntryChallengeCreated = {
      ...this.activityLogEntryBase,
      challenge: challenge,
    };
    return activityChallengeCreated;
  }

  async [ActivityEventType.OPPORTUNITY_CREATED](rawActivity: IActivity) {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      rawActivity.resourceID
    );
    const activityOpportunityCreated: IActivityLogEntryOpportunityCreated = {
      ...this.activityLogEntryBase,
      opportunity: opportunity,
    };
    return activityOpportunityCreated;
  }

  async [ActivityEventType.CARD_COMMENT](rawActivity: IActivity) {
    const calloutCardComment = await this.calloutService.getCalloutOrFail(
      rawActivity.parentID
    );
    const cardCommentedOn = await this.aspectService.getAspectOrFail(
      rawActivity.resourceID
    );
    const activityCalloutCardCommentedOn: IActivityLogEntryCalloutCardComment =
      {
        ...this.activityLogEntryBase,
        callout: calloutCardComment,
        card: cardCommentedOn,
      };
    return activityCalloutCardCommentedOn;
  }

  async [ActivityEventType.DISCUSSION_COMMENT](rawActivity: IActivity) {
    const calloutDiscussionComment = await this.calloutService.getCalloutOrFail(
      rawActivity.resourceID
    );
    const activityCalloutDiscussionComment: IActivityLogEntryCalloutDiscussionComment =
      {
        ...this.activityLogEntryBase,
        callout: calloutDiscussionComment,
      };
    return activityCalloutDiscussionComment;
  }

  async [ActivityEventType.UPDATE_SENT](rawActivity: IActivity) {
    const updates = await this.updatesService.getUpdatesOrFail(
      rawActivity.parentID
    );
    const activityUpdateSent: IActivityLogEntryUpdateSent = {
      ...this.activityLogEntryBase,
      updates: updates,
      message: rawActivity.description || '',
    };
    return activityUpdateSent;
  }
}
