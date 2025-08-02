import { UserNotificationEvent } from '@common/enums/user.notification.event';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class NotificationRecipientsInput {
  @Field(() => UserNotificationEvent, {
    nullable: false,
    description: 'The type of notification setting to look up recipients for.',
  })
  eventType!: UserNotificationEvent;

  @Field(() => UUID, {
    nullable: true,
    description:
      'The ID of the entity to retrieve the recipients for. This could be a Space, Organization etc, and is specific to the event type.',
  })
  entityID?: string;

  @Field(() => UUID, {
    nullable: true,
    description: 'The ID of the User that triggered the event.',
  })
  triggeredBy?: string;
}
