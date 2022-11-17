import { ActivityEventType } from '@common/enums/activity.event.type';
import { IActivityLogEntryMemberJoined } from '@services/api/activity-log/dto/activity.log.dto.entry.member.joined.interface';
import { IActivityLogEntryCalloutPublished } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.published';
import { IActivityLogEntryCalloutCardCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.card.created';
import { IActivityLogEntryCalloutCanvasCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.canvas.created';
import { IActivityLogEntryChallengeCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.challenge.created';
import { IActivityLogEntryOpportunityCreated } from '@services/api/activity-log/dto/activity.log.dto.entry.opportunity.created';
import { IActivityLogEntryCalloutCardComment } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.card.comment';
import { IActivityLogEntryCalloutDiscussionComment } from '@services/api/activity-log/dto/activity.log.dto.entry.callout.discussion.comment';
import { IActivity } from '@platform/activity';

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
  [ActivityEventType.UPDATE_SENT]: ActivityLogBuilderFunction<IActivityLogEntryCalloutDiscussionComment>;
}
