import { Field, InterfaceType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { IUser } from '@domain/community/user/user.interface';
import { IActivityLogEntryMemberJoined } from './activity.log.dto.entry.member.joined.interface';
import { IActivityLogEntryCalloutPublished } from './activity.log.dto.entry.callout.published';
import { IActivityLogEntryCalloutCardCreated } from './activity.log.dto.entry.callout.card.created';
import { IActivityLogEntryCalloutCanvasCreated } from './activity.log.dto.entry.callout.canvas.created';
import { IActivityLogEntryCalloutCardComment } from './activity.log.dto.entry.callout.card.comment';
import { IActivityLogEntryCalloutDiscussionComment } from './activity.log.dto.entry.callout.discussion.comment';
import { IActivityLogEntryChallengeCreated } from './activity.log.dto.entry.challenge.created';
import { IActivityLogEntryOpportunityCreated } from './activity.log.dto.entry.opportunity.created';

@InterfaceType('ActivityLogEntry', {
  resolveType(activityLogEntry) {
    const type = activityLogEntry.type;
    switch (type) {
      case ActivityEventType.CALLOUT_PUBLISHED:
        return IActivityLogEntryCalloutPublished;
      case ActivityEventType.CARD_CREATED:
        return IActivityLogEntryCalloutCardCreated;
      case ActivityEventType.CANVAS_CREATED:
        return IActivityLogEntryCalloutCanvasCreated;
      case ActivityEventType.CHALLENGE_CREATED:
        return IActivityLogEntryChallengeCreated;
      case ActivityEventType.OPPORTUNITY_CREATED:
        return IActivityLogEntryOpportunityCreated;
      case ActivityEventType.CARD_COMMENT:
        return IActivityLogEntryCalloutCardComment;
      case ActivityEventType.DISCUSSION_COMMENT:
        return IActivityLogEntryCalloutDiscussionComment;
      case ActivityEventType.MEMBER_JOINED:
        return IActivityLogEntryMemberJoined;
    }

    throw new RelationshipNotFoundException(
      `Unable to determine activity log entry type for ${activityLogEntry.id}: ${type}`,
      LogContext.ACTIVITY
    );
  },
})
export abstract class IActivityLogEntry {
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
  type!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The text details for this Activity.',
  })
  description?: string;
}
