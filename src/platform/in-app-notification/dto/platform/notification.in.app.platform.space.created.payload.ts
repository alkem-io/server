import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationPlatformSpaceCreatedPayload
  extends InAppNotificationAdditionalData {
  spaceID: string;
}
