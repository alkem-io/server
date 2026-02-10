import { ActivityEventType } from '@common/enums/activity.event.type';
import { IActivity } from '@platform/activity/activity.interface';
import { IActivityLogEntryCalloutDiscussionComment } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.discussion.comment';
import { IActivityLogEntryCalloutMemoCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.memo.created';
import { IActivityLogEntryCalloutPostComment } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.post.comment';
import { IActivityLogEntryCalloutPostCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.post.created';
import { IActivityLogEntryCalloutPublished } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.published';
import { IActivityLogEntryCalloutWhiteboardCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.whiteboard.created';
import { IActivityLogEntryMemberJoined } from '@services/api/activity-log/dto/activity.log.dto.entry.member.joined.interface';
import { IActivityLogEntrySubspaceCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.subspace.created';
import { IActivityLogEntryCalendarEventCreated } from './dto/activity.log.dto.entry.calendar.event.created';
import { IActivityLogEntryCalloutLinkCreated } from './dto/activity.log.dto.entry.callout.link.created';
import { IActivityLogEntryCalloutWhiteboardContentModified } from './dto/activity.log.dto.entry.callout.whiteboard.content.modified';
import { IActivityLogEntryUpdateSent } from './dto/activity.log.dto.entry.update.sent';

type ActivityLogBuilderFunction<TypedActivityLogEntry> = (
  rawActivity: IActivity
) => Promise<TypedActivityLogEntry>;

export interface IActivityLogBuilder {
  [ActivityEventType.MEMBER_JOINED]: ActivityLogBuilderFunction<IActivityLogEntryMemberJoined>;
  [ActivityEventType.CALLOUT_PUBLISHED]: ActivityLogBuilderFunction<IActivityLogEntryCalloutPublished>;
  [ActivityEventType.CALLOUT_POST_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryCalloutPostCreated>;
  [ActivityEventType.CALLOUT_LINK_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryCalloutLinkCreated>;
  [ActivityEventType.CALLOUT_WHITEBOARD_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryCalloutWhiteboardCreated>;
  [ActivityEventType.CALLOUT_MEMO_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryCalloutMemoCreated>;
  [ActivityEventType.CALLOUT_WHITEBOARD_CONTENT_MODIFIED]: ActivityLogBuilderFunction<IActivityLogEntryCalloutWhiteboardContentModified>;
  [ActivityEventType.CALLOUT_POST_COMMENT]: ActivityLogBuilderFunction<IActivityLogEntryCalloutPostComment>;
  [ActivityEventType.SUBSPACE_CREATED]: ActivityLogBuilderFunction<IActivityLogEntrySubspaceCreated>;
  [ActivityEventType.DISCUSSION_COMMENT]: ActivityLogBuilderFunction<IActivityLogEntryCalloutDiscussionComment>;
  [ActivityEventType.UPDATE_SENT]: ActivityLogBuilderFunction<IActivityLogEntryUpdateSent>;
  [ActivityEventType.CALENDAR_EVENT_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryCalendarEventCreated>;
}
