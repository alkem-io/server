import { IActivity } from '@platform/activity';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { IActivityLogEntryMemberJoined } from '@services/api/activity-log/dto/activity.log.dto.entry.member.joined.interface';
import { IActivityLogEntryCalloutPublished } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.published';
import { IActivityLogEntryCalloutPostCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.post.created';
import { IActivityLogEntryCalloutWhiteboardCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.whiteboard.created';
import { IActivityLogEntryChallengeCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.challenge.created';
import { IActivityLogEntryOpportunityCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.opportunity.created';
import { IActivityLogEntryCalloutPostComment } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.post.comment';
import { IActivityLogEntryCalloutDiscussionComment } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.discussion.comment';
import { UserService } from '@domain/community/user/user.service';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { PostService } from '@domain/collaboration/post/post.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { CommunityService } from '@domain/community/community/community.service';
import { IActivityLogEntry } from './dto/activity.log.entry.interface';
import { IActivityLogEntryUpdateSent } from './dto/activity.log.dto.entry.update.sent';
import { RoomService } from '@domain/communication/room/room.service';

interface ActivityLogBuilderFunction<TypedActivityLogEntry> {
  (rawActivity: IActivity): Promise<TypedActivityLogEntry>;
}

export interface IActivityLogBuilder {
  [ActivityEventType.MEMBER_JOINED]: ActivityLogBuilderFunction<IActivityLogEntryMemberJoined>;
  [ActivityEventType.CALLOUT_PUBLISHED]: ActivityLogBuilderFunction<IActivityLogEntryCalloutPublished>;
  [ActivityEventType.CARD_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryCalloutPostCreated>;
  [ActivityEventType.CANVAS_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryCalloutWhiteboardCreated>;
  [ActivityEventType.CHALLENGE_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryChallengeCreated>;
  [ActivityEventType.OPPORTUNITY_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryOpportunityCreated>;
  [ActivityEventType.CARD_COMMENT]: ActivityLogBuilderFunction<IActivityLogEntryCalloutPostComment>;
  [ActivityEventType.DISCUSSION_COMMENT]: ActivityLogBuilderFunction<IActivityLogEntryCalloutDiscussionComment>;
  [ActivityEventType.UPDATE_SENT]: ActivityLogBuilderFunction<IActivityLogEntryUpdateSent>;
}

export default class ActivityLogBuilderService implements IActivityLogBuilder {
  constructor(
    private readonly activityLogEntryBase: IActivityLogEntry,
    private readonly userService: UserService,
    private readonly calloutService: CalloutService,
    private readonly postService: PostService,
    private readonly whiteboardService: WhiteboardService,
    private readonly challengeService: ChallengeService,
    private readonly opportunityService: OpportunityService,
    private readonly communityService: CommunityService,
    private readonly roomService: RoomService
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
    const calloutPostCreated = await this.calloutService.getCalloutOrFail(
      rawActivity.parentID
    );
    const postCreated = await this.postService.getPostOrFail(
      rawActivity.resourceID
    );
    const activityCalloutPostCreated: IActivityLogEntryCalloutPostCreated = {
      ...this.activityLogEntryBase,
      callout: calloutPostCreated,
      post: postCreated,
    };
    return activityCalloutPostCreated;
  }

  async [ActivityEventType.CANVAS_CREATED](rawActivity: IActivity) {
    const calloutWhiteboardCreated = await this.calloutService.getCalloutOrFail(
      rawActivity.parentID
    );
    const whiteboardCreated = await this.whiteboardService.getWhiteboardOrFail(
      rawActivity.resourceID
    );
    const activityCalloutWhiteboardCreated: IActivityLogEntryCalloutWhiteboardCreated =
      {
        ...this.activityLogEntryBase,
        callout: calloutWhiteboardCreated,
        whiteboard: whiteboardCreated,
      };
    return activityCalloutWhiteboardCreated;
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
    const calloutPostComment = await this.calloutService.getCalloutOrFail(
      rawActivity.parentID
    );
    const postCommentedOn = await this.postService.getPostOrFail(
      rawActivity.resourceID
    );
    const activityCalloutPostCommentedOn: IActivityLogEntryCalloutPostComment =
      {
        ...this.activityLogEntryBase,
        callout: calloutPostComment,
        post: postCommentedOn,
      };
    return activityCalloutPostCommentedOn;
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
    const updates = await this.roomService.getRoomOrFail(
      rawActivity.resourceID
    );
    const activityUpdateSent: IActivityLogEntryUpdateSent = {
      ...this.activityLogEntryBase,
      updates: updates,
      message: rawActivity.description || '',
    };
    return activityUpdateSent;
  }
}
