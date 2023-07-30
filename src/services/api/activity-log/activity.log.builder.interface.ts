import { ActivityEventType } from '@common/enums/activity.event.type';
import { IActivityLogEntryMemberJoined } from '@services/api/activity-log/dto/activity.log.dto.entry.member.joined.interface';
import { IActivityLogEntryCalloutPublished } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.published';
import { IActivityLogEntryCalloutPostCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.post.created';
import { IActivityLogEntryCalloutWhiteboardCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.whiteboard.created';
import { IActivityLogEntryChallengeCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.challenge.created';
import { IActivityLogEntryOpportunityCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.opportunity.created';
import { IActivityLogEntryCalloutPostComment } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.post.comment';
import { IActivityLogEntryCalloutDiscussionComment } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.discussion.comment';
import { IActivity } from '@platform/activity';
import { IActivityLogEntryCalendarEventCreated } from './dto/activity.log.dto.entry.calender.event.created';
import { IActivityLogEntryUpdateSent } from './dto/activity.log.dto.entry.update.sent';
import { IActivityLogEntryCalloutLinkCreated } from './dto/activity.log.dto.entry.callout.link.created';

interface ActivityLogBuilderFunction<TypedActivityLogEntry> {
  (rawActivity: IActivity): Promise<TypedActivityLogEntry>;
}

export interface IActivityLogBuilder {
  [ActivityEventType.MEMBER_JOINED]: ActivityLogBuilderFunction<IActivityLogEntryMemberJoined>;
  [ActivityEventType.CALLOUT_PUBLISHED]: ActivityLogBuilderFunction<IActivityLogEntryCalloutPublished>;
  [ActivityEventType.CALLOUT_POST_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryCalloutPostCreated>;
  [ActivityEventType.CALLOUT_LINK_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryCalloutLinkCreated>;
  [ActivityEventType.CALLOUT_WHITEBOARD_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryCalloutWhiteboardCreated>;
  [ActivityEventType.CALLOUT_POST_COMMENT]: ActivityLogBuilderFunction<IActivityLogEntryCalloutPostComment>;
  [ActivityEventType.CHALLENGE_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryChallengeCreated>;
  [ActivityEventType.OPPORTUNITY_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryOpportunityCreated>;
  [ActivityEventType.DISCUSSION_COMMENT]: ActivityLogBuilderFunction<IActivityLogEntryCalloutDiscussionComment>;
  [ActivityEventType.UPDATE_SENT]: ActivityLogBuilderFunction<IActivityLogEntryUpdateSent>;
  [ActivityEventType.CALENDAR_EVENT_CREATED]: ActivityLogBuilderFunction<IActivityLogEntryCalendarEventCreated>;
}
