import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from './in.app.notification.receiver.payload.base';

export interface InAppNotificationCalloutPublishedPayload
  extends InAppNotificationPayloadBase {
  type: NotificationEvent.SPACE_CALLOUT_PUBLISHED;
  calloutID: string;
  spaceID: string;
}
