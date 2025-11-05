import { Field, ObjectType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadSpace } from './notification.in.app.payload.space.base';

@ObjectType('InAppNotificationPayloadSpaceCommunityCalendarEventComment', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunityCalendarEventComment extends InAppNotificationPayloadSpace {
  @Field(() => UUID, {
    description: 'ID of the calendar event that was commented on.',
  })
  calendarEventID!: string;

  @Field(() => String, {
    description: 'Display title of the calendar event.',
  })
  calendarEventTitle!: string;

  @Field(() => UUID, {
    description: 'ID of the comment message.',
  })
  commentID!: string;

  @Field(() => String, {
    description: 'Preview text of the comment (first 200 characters).',
  })
  commentText!: string;

  @Field(() => UUID, {
    description: 'ID of the user who posted the comment.',
  })
  commenterID!: string;
}
