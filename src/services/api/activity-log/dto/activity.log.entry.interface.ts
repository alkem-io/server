import { Field, InterfaceType } from '@nestjs/graphql';
import { NameID, UUID } from '@domain/common/scalars';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { IUser } from '@domain/community/user/user.interface';
import { IActivityLogEntryMemberJoined } from './activity.log.dto.entry.member.joined.interface';
import { IActivityLogEntryCalloutPublished } from './activity.log.dto.entry.callout.published';
import { IActivityLogEntryCalloutPostCreated } from './activity.log.dto.entry.callout.post.created';
import { IActivityLogEntryCalloutWhiteboardCreated } from './activity.log.dto.entry.callout.whiteboard.created';
import { IActivityLogEntryCalloutPostComment } from './activity.log.dto.entry.callout.post.comment';
import { IActivityLogEntryCalloutDiscussionComment } from './activity.log.dto.entry.callout.discussion.comment';
import { IActivityLogEntryChallengeCreated } from './activity.log.dto.entry.subspace.created';
import { IActivityLogEntryOpportunityCreated } from './activity.log.dto.entry.subsubspace.created';
import { IActivityLogEntryUpdateSent } from './activity.log.dto.entry.update.sent';
import { IActivityLogEntryCalendarEventCreated } from './activity.log.dto.entry.calendar.event.created';
import { IActivityLogEntryCalloutLinkCreated } from './activity.log.dto.entry.callout.link.created';
import { IActivityLogEntryCalloutWhiteboardContentModified } from './activity.log.dto.entry.callout.whiteboard.content.modified';
import { ISpace } from '@domain/challenge/space/space.interface';

@InterfaceType('ActivityLogEntry', {
  resolveType(activityLogEntry) {
    const type = activityLogEntry.type;
    switch (type) {
      case ActivityEventType.CALLOUT_PUBLISHED:
        return IActivityLogEntryCalloutPublished;
      case ActivityEventType.CALLOUT_POST_CREATED:
        return IActivityLogEntryCalloutPostCreated;
      case ActivityEventType.CALLOUT_WHITEBOARD_CREATED:
        return IActivityLogEntryCalloutWhiteboardCreated;
      case ActivityEventType.CALLOUT_WHITEBOARD_CONTENT_MODIFIED:
        return IActivityLogEntryCalloutWhiteboardContentModified;
      case ActivityEventType.CALLOUT_POST_COMMENT:
        return IActivityLogEntryCalloutPostComment;
      case ActivityEventType.CALLOUT_LINK_CREATED:
        return IActivityLogEntryCalloutLinkCreated;
      case ActivityEventType.CHALLENGE_CREATED:
        return IActivityLogEntryChallengeCreated;
      case ActivityEventType.OPPORTUNITY_CREATED:
        return IActivityLogEntryOpportunityCreated;
      case ActivityEventType.DISCUSSION_COMMENT:
        return IActivityLogEntryCalloutDiscussionComment;
      case ActivityEventType.MEMBER_JOINED:
        return IActivityLogEntryMemberJoined;
      case ActivityEventType.UPDATE_SENT:
        return IActivityLogEntryUpdateSent;
      case ActivityEventType.CALENDAR_EVENT_CREATED:
        return IActivityLogEntryCalendarEventCreated;
    }

    throw new RelationshipNotFoundException(
      `Unable to determine activity log entry type for ${activityLogEntry.id}: ${type}`,
      LogContext.ACTIVITY
    );
  },
})
export class IActivityLogEntry {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => IUser, {
    nullable: false,
    description: 'The user that triggered this Activity.',
  })
  triggeredBy!: IUser;

  @Field(() => Date, {
    description: 'The timestamp for the Activity.',
    nullable: false,
  })
  createdDate!: Date;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The id of the Collaboration entity within which the Activity was generated.',
  })
  collaborationID!: string;

  @Field(() => ActivityEventType, {
    nullable: false,
    description: 'The event type for this Activity.',
  })
  type!: ActivityEventType;

  @Field(() => String, {
    nullable: false,
    description: 'The text details for this Activity.',
  })
  description?: string;

  @Field(() => Boolean, {
    description:
      'Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter.',
    defaultValue: false,
  })
  child?: boolean;

  @Field(() => NameID, {
    description: 'The nameID of the parent',
  })
  parentNameID!: string;

  @Field(() => String, {
    description: 'The display name of the parent',
  })
  parentDisplayName!: string;

  @Field(() => ISpace, {
    nullable: true,
    description: 'The Space where the activity happened',
  })
  space?: ISpace;
}
