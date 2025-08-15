import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBaseSpace } from './notification.in.app.payload.space.base';
import { InAppNotificationPayloadBaseMessage } from '../../../../services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base.message';

export interface InAppNotificationSpaceCollaborationPostCommentCreatedPayload
  extends InAppNotificationPayloadBaseSpace {
  type: NotificationEvent.SPACE_COLLABORATION_POST_COMMENT_CREATED;
  calloutID: string;
  postID: string;
  message: InAppNotificationPayloadBaseMessage;
}
