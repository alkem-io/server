import { InAppNotificationPayloadSpaceBase } from './notification.in.app.payload.space.base';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { ActorType } from '@common/enums/actor.type';

@ObjectType('InAppNotificationPayloadSpaceCommunityActor', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunityActor extends InAppNotificationPayloadSpaceBase {
  actorId!: string;
  actorType!: ActorType;
  declare type: NotificationEventPayload.SPACE_COMMUNITY_ACTOR;
}
