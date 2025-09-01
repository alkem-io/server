import { Field, InputType } from '@nestjs/graphql';
import { NotificationEvent } from '@common/enums/notification.event';

@InputType()
export class NotificationEventsFilterInput {
  @Field(() => [NotificationEvent], {
    nullable: true,
    description:
      'Return Notifications with a type matching one of the provided types.',
  })
  types!: NotificationEvent[];
}
