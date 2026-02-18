import { ActivityEventType } from '@common/enums/activity.event.type';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { getContributorType } from '@domain/actor/actor/actor.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { LinkService } from '@domain/collaboration/link/link.service';
import { PostService } from '@domain/collaboration/post/post.service';
import { MemoService } from '@domain/common/memo/memo.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { RoomService } from '@domain/communication/room/room.service';
import { CommunityService } from '@domain/community/community/community.service';
import { SpaceService } from '@domain/space/space/space.service';
import { CalendarService } from '@domain/timeline/calendar/calendar.service';
import { CalendarEventService } from '@domain/timeline/event/event.service';
import { IActivity } from '@platform/activity';
import { IActivityLogEntryCalloutDiscussionComment } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.discussion.comment';
import { IActivityLogEntryCalloutMemoCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.memo.created';
import { IActivityLogEntryCalloutPostComment } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.post.comment';
import { IActivityLogEntryCalloutPostCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.post.created';
import { IActivityLogEntryCalloutPublished } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.published';
import { IActivityLogEntryCalloutWhiteboardCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.whiteboard.created';
import { IActivityLogEntryMemberJoined } from '@services/api/activity-log/dto/activity.log.dto.entry.member.joined.interface';
import { IActivityLogEntrySubspaceCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.subspace.created';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { IActivityLogBuilder } from './activity.log.builder.interface';
import { IActivityLogEntryCalendarEventCreated } from './dto/activity.log.dto.entry.calendar.event.created';
import { IActivityLogEntryCalloutLinkCreated } from './dto/activity.log.dto.entry.callout.link.created';
import { IActivityLogEntryCalloutWhiteboardContentModified } from './dto/activity.log.dto.entry.callout.whiteboard.content.modified';
import { IActivityLogEntryUpdateSent } from './dto/activity.log.dto.entry.update.sent';
import { IActivityLogEntry } from './dto/activity.log.entry.interface';

export default class ActivityLogBuilderService implements IActivityLogBuilder {
  constructor(
    private readonly activityLogEntryBase: IActivityLogEntry,
    private readonly actorLookupService: ActorLookupService,
    private readonly calloutService: CalloutService,
    private readonly postService: PostService,
    private readonly whiteboardService: WhiteboardService,
    private readonly memoService: MemoService,
    private readonly spaceService: SpaceService,
    private readonly communityService: CommunityService,
    private readonly roomService: RoomService,
    private readonly linkService: LinkService,
    private readonly calendarService: CalendarService,
    private readonly calendarEventService: CalendarEventService,
    private readonly urlGeneratorService: UrlGeneratorService
  ) {}

  async [ActivityEventType.MEMBER_JOINED](rawActivity: IActivity) {
    if (!rawActivity.parentID) {
      throw new EntityNotFoundException(
        `ParentID not set on ${rawActivity.type} activity`,
        LogContext.ACTIVITY,
        {
          activityId: rawActivity.id,
          type: rawActivity.type,
        }
      );
    }

    const community = await this.communityService.getCommunityOrFail(
      rawActivity.parentID
    );
    const contributorJoining = await this.actorLookupService.getActorByIdOrFail(
      rawActivity.resourceID
    );

    const actorType = getContributorType(contributorJoining);
    const activityMemberJoined: IActivityLogEntryMemberJoined = {
      ...this.activityLogEntryBase,
      community: community,
      contributor: contributorJoining,
      actorType: actorType,
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
    if (!rawActivity.parentID) {
      throw new EntityNotFoundException(
        `ParentID not set on ${rawActivity.type} activity`,
        LogContext.ACTIVITY,
        {
          activityId: rawActivity.id,
          type: rawActivity.type,
        }
      );
    }

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
    if (!rawActivity.parentID) {
      throw new EntityNotFoundException(
        `ParentID not set on ${rawActivity.type} activity`,
        LogContext.ACTIVITY,
        {
          activityId: rawActivity.id,
          type: rawActivity.type,
        }
      );
    }

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
    if (!rawActivity.parentID) {
      throw new EntityNotFoundException(
        `ParentID not set on ${rawActivity.type} activity`,
        LogContext.ACTIVITY,
        {
          activityId: rawActivity.id,
          type: rawActivity.type,
        }
      );
    }

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

  async [ActivityEventType.CALLOUT_MEMO_CREATED](rawActivity: IActivity) {
    if (!rawActivity.parentID) {
      throw new EntityNotFoundException(
        `ParentID not set on ${rawActivity.type} activity`,
        LogContext.ACTIVITY,
        {
          activityId: rawActivity.id,
          type: rawActivity.type,
        }
      );
    }

    const calloutMemoCreated = await this.calloutService.getCalloutOrFail(
      rawActivity.parentID
    );
    const memoCreated = await this.memoService.getMemoOrFail(
      rawActivity.resourceID
    );
    const activityCalloutMemoCreated: IActivityLogEntryCalloutMemoCreated = {
      ...this.activityLogEntryBase,
      callout: calloutMemoCreated,
      memo: memoCreated,
    };
    return activityCalloutMemoCreated;
  }

  async [ActivityEventType.CALLOUT_WHITEBOARD_CONTENT_MODIFIED](
    rawActivity: IActivity
  ) {
    if (!rawActivity.parentID) {
      throw new EntityNotFoundException(
        `ParentID not set on ${rawActivity.type} activity`,
        LogContext.ACTIVITY,
        {
          activityId: rawActivity.id,
          type: rawActivity.type,
        }
      );
    }

    const parentCallout = await this.calloutService.getCalloutOrFail(
      rawActivity.parentID
    );
    const updatedWhiteboard = await this.whiteboardService.getWhiteboardOrFail(
      rawActivity.resourceID
    );
    const activityCalloutWhiteboardContentModified: IActivityLogEntryCalloutWhiteboardContentModified =
      {
        ...this.activityLogEntryBase,
        callout: parentCallout,
        whiteboard: updatedWhiteboard,
      };
    return activityCalloutWhiteboardContentModified;
  }

  async [ActivityEventType.CALLOUT_POST_COMMENT](rawActivity: IActivity) {
    if (!rawActivity.parentID) {
      throw new EntityNotFoundException(
        `ParentID not set on ${rawActivity.type} activity`,
        LogContext.ACTIVITY,
        {
          activityId: rawActivity.id,
          type: rawActivity.type,
        }
      );
    }

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

  async [ActivityEventType.SUBSPACE_CREATED](rawActivity: IActivity) {
    const subspace = await this.spaceService.getSpaceOrFail(
      rawActivity.resourceID
    );
    const activitySubspaceCreated: IActivityLogEntrySubspaceCreated = {
      ...this.activityLogEntryBase,
      subspace: subspace,
    };
    return activitySubspaceCreated;
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

    const space = this.activityLogEntryBase.space;
    if (!space) {
      throw new EntityNotFoundException(
        'Unable to find Space on activity log entry base',
        LogContext.COLLABORATION,
        { collaborationID: rawActivity.collaborationID }
      );
    }

    const spaceUrl = await this.urlGeneratorService.generateUrlForProfile(
      space.about.profile
    );
    const activityUpdateSent: IActivityLogEntryUpdateSent = {
      ...this.activityLogEntryBase,
      updates: updates,
      message: rawActivity.description || '',
      journeyUrl: spaceUrl,
    };
    return activityUpdateSent;
  }

  async [ActivityEventType.CALENDAR_EVENT_CREATED](rawActivity: IActivity) {
    if (!rawActivity.parentID) {
      throw new EntityNotFoundException(
        `ParentID not set on ${rawActivity.type} activity`,
        LogContext.ACTIVITY,
        {
          activityId: rawActivity.id,
          type: rawActivity.type,
        }
      );
    }

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
