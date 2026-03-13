import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { Field, ObjectType } from '@nestjs/graphql';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadSpaceBase } from './notification.in.app.payload.space.base';

@ObjectType('InAppNotificationPayloadSpaceCollaborationPoll', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCollaborationPoll extends InAppNotificationPayloadSpaceBase {
  declare type: NotificationEventPayload.SPACE_COLLABORATION_POLL;
  calloutID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The ID of the Poll this notification relates to.',
  })
  pollID!: string;
}
