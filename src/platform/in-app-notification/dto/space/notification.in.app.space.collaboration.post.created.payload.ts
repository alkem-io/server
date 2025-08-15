import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBaseSpace } from './notification.in.app.payload.space.base';

export interface InAppNotificationSpaceCollaborationPostCreatedPayload
  extends InAppNotificationPayloadBaseSpace {
  type: NotificationEvent.SPACE_COLLABORATION_POST_CREATED;
  calloutID: string;
  postID: string;
}
