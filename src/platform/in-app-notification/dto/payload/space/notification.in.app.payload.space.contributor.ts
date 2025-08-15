import { InAppNotificationPayloadSpace } from './notification.in.app.payload.space.base';

export interface InAppNotificationPayloadSpaceContributor
  extends InAppNotificationPayloadSpace {
  contributorID: string;
}
