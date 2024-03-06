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
import { OpportunityService } from '@domain/challenge/opportunity/opportunity.service';
import { CommunityService } from '@domain/community/community/community.service';
import { IActivityLogEntry } from './dto/activity.log.entry.interface';
import { IActivityLogEntryUpdateSent } from './dto/activity.log.dto.entry.update.sent';
import { RoomService } from '@domain/communication/room/room.service';
import { IActivityLogBuilder } from './activity.log.builder.interface';
import { IActivityLogEntryCalendarEventCreated } from './dto/activity.log.dto.entry.calendar.event.created';
import { IActivityLogEntryCalloutLinkCreated } from './dto/activity.log.dto.entry.callout.link.created';
import { CalendarService } from '@domain/timeline/calendar/calendar.service';
import { CalendarEventService } from '@domain/timeline/event/event.service';
import { LinkService } from '@domain/collaboration/link/link.service';

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
    private readonly roomService: RoomService,
    private readonly linkService: LinkService,
    private readonly calendarService: CalendarService,
    private readonly calendarEventService: CalendarEventService
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

  async [ActivityEventType.CALLOUT_POST_CREATED](rawActivity: IActivity) {
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

  async [ActivityEventType.CALLOUT_LINK_CREATED](rawActivity: IActivity) {
    const calloutPostCreated = await this.calloutService.getCalloutOrFail(
      rawActivity.parentID
    );
    const linkCreated = await this.linkService.getLinkOrFail(
      rawActivity.resourceID
    );
    const activityCalloutLinkCreated: IActivityLogEntryCalloutLinkCreated = {
      ...this.activityLogEntryBase,
      callout: calloutPostCreated,
      link: linkCreated,
    };
    return activityCalloutLinkCreated;
  }

  async [ActivityEventType.CALLOUT_WHITEBOARD_CREATED](rawActivity: IActivity) {
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

  async [ActivityEventType.CALLOUT_POST_COMMENT](rawActivity: IActivity) {
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

  async [ActivityEventType.CALENDAR_EVENT_CREATED](rawActivity: IActivity) {
    const calendar = await this.calendarService.getCalendarOrFail(
      rawActivity.parentID
    );
    const calendarEvent =
      await this.calendarEventService.getCalendarEventOrFail(
        rawActivity.resourceID
      );
    const activityCalendarEvent: IActivityLogEntryCalendarEventCreated = {
      ...this.activityLogEntryBase,
      calendar: calendar,
      calendarEvent: calendarEvent,
    };
    return activityCalendarEvent;
  }
}
