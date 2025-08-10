import { InAppNotificationPayloadBase } from './notification.in.app.payload.base';
import { InAppNotificationEventType } from '@common/enums/in.app.notification.event.type';

export interface InAppNotificationCalloutPublishedPayload
  extends InAppNotificationPayloadBase {
  type: InAppNotificationEventType.COLLABORATION_CALLOUT_PUBLISHED;
  calloutID: string;
  spaceID: string;
}
