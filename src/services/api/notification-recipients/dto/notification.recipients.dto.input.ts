import { NotificationEvent } from '@common/enums/notification.event';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

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
}
