import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { ObjectType } from '@nestjs/graphql';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadSpaceBase } from './notification.in.app.payload.space.base';

@ObjectType('InAppNotificationPayloadSpaceCollaborationCalloutReaction', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCollaborationCalloutReaction extends InAppNotificationPayloadSpaceBase {
  calloutID!: string;
  /** Emoji slug from the platform allow-list. Clients own slug-to-glyph rendering. */
  emoji!: string;
  declare type: NotificationEventPayload.SPACE_COLLABORATION_CALLOUT_REACTION;
}
