import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from './notification.in.app.payload.base';

export interface InAppNotificationCalloutPublishedPayload
  extends InAppNotificationPayloadBase {
  type: NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED;
  calloutID: string;
  spaceID: string;
}
