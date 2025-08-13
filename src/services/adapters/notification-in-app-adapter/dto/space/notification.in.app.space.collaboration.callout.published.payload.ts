import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBaseSpace } from './notification.in.app.payload.space.base';

export interface InAppNotificationSpaceCollaborationCalloutPublishedPayload
  extends InAppNotificationPayloadBaseSpace {
  type: NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED;
  calloutID: string;
}
