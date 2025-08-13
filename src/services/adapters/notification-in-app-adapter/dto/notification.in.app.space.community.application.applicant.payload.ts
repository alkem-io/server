import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBaseSpace } from './notification.in.app.payload.space.base';

export interface InAppNotificationSpaceCommunityApplicationApplicantPayload
  extends InAppNotificationPayloadBaseSpace {
  type: NotificationEvent.SPACE_COMMUNITY_APPLICATION_APPLICANT;
  applicationID: string;
  applicationStatus: string;
}
