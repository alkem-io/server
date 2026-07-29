import { NotificationEvent } from '@common/enums/notification.event';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { ArrayMaxSize } from 'class-validator';

// 034-messaging-notifications (FR-020): the platform has no enforced member
// cap on group conversations today; this bound is the input-validation half
// of the fan-out safety net (alongside the suppression window and the
// per-user push budget). Conversations larger than this are batched
// internally by the caller — see ConversationNotificationService.
export const NOTIFICATION_RECIPIENTS_USER_IDS_MAX = 100;

@InputType()
export class NotificationRecipientsInput {
  @Field(() => NotificationEvent, {
    nullable: false,
    description: 'The type of notification setting to look up recipients for.',
  })
  eventType!: NotificationEvent;

  @Field(() => UUID, {
    nullable: true,
    description: 'The ID of the User that triggered the event.',
  })
  triggeredBy?: string;

  @Field(() => UUID, {
    nullable: true,
    description: 'The ID of the space to retrieve the recipients for.',
  })
  spaceID?: string;

  @Field(() => UUID, {
    nullable: true,
    description:
      'The ID of the specific user recipient for user-related notifications (e.g., invitations, mentions).',
  })
  userID?: string;

  @Field(() => UUID, {
    nullable: true,
    description: 'The ID of the Organization to use to determine recipients.',
  })
  organizationID?: string;

  @Field(() => UUID, {
    nullable: true,
    description:
      'The ID of the Virtual Contributor to use to determine recipients.',
  })
  virtualContributorID?: string;

  @Field(() => [UUID], {
    nullable: true,
    description:
      'Plural recipient user IDs (e.g. conversation-message events) — resolved via a single OR-combined credentials query. Bounded to at most 100 entries; larger conversations must be fanned out by the caller in bounded batches.',
  })
  @ArrayMaxSize(NOTIFICATION_RECIPIENTS_USER_IDS_MAX)
  userIDs?: string[];
}
