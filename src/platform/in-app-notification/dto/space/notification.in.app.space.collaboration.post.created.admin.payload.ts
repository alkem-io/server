import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBaseSpace } from './notification.in.app.payload.space.base';
import { InAppNotificationPayloadBaseMessage } from '../../../../services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base.message';

export interface InAppNotificationSpaceCollaborationPostCreatedAdminPayload
  extends InAppNotificationPayloadBaseSpace {
  type: NotificationEvent.SPACE_COLLABORATION_POST_CREATED_ADMIN;
  calloutID: string;
  postID: string;
  message: InAppNotificationPayloadBaseMessage;
}
