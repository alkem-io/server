import { InAppNotificationPayloadSpace } from './notification.in.app.payload.space.base';

export interface InAppNotificationPayloadSpaceInvitation
  extends InAppNotificationPayloadSpace {
  invitationID: string;
}
