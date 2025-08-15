import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBaseSpace } from './notification.in.app.payload.space.base';

export interface InAppNotificationSpaceCollaborationWhiteboardCreatedPayload
  extends InAppNotificationPayloadBaseSpace {
  type: NotificationEvent.SPACE_COLLABORATION_WHITEBOARD_CREATED;
  calloutID: string;
  whiteboardID: string;
}
