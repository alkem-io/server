import { IMessage } from '@domain/communication/message/message.interface';
import { NotificationInputBase } from '../notification.dto.input.base';
import { IRoom } from '@domain/communication/room/room.interface';
import { IPost } from '@domain/collaboration/post';
import { ICallout } from '@domain/collaboration/callout/callout.interface';

export interface NotificationInputCollaborationCalloutPostContributionComment
  extends NotificationInputBase {
  callout: ICallout;
  post: IPost;
  room: IRoom;
  commentSent: IMessage;
}
