import { ActorType } from '@common/enums/actor.type';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { ObjectType } from '@nestjs/graphql';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadSpaceBase } from './notification.in.app.payload.space.base';

@ObjectType('InAppNotificationPayloadSpaceCommunityActor', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunityActor extends InAppNotificationPayloadSpaceBase {
  actorID!: string;
  actorType!: ActorType;
  declare type: NotificationEventPayload.SPACE_COMMUNITY_ACTOR;
}
