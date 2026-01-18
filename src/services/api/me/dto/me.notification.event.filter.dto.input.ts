import { NotificationEvent } from '@common/enums/notification.event';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class NotificationEventsFilterInput {
  @Field(() => [NotificationEvent], {
    nullable: true,
    description:
      'Return Notifications with a type matching one of the provided types.',
  })
  types!: NotificationEvent[];
}
