import { IMessage } from '@domain/communication/message/message.interface';
import { NotificationInputBase } from '../notification.dto.input.base';
import { IRoom } from '@domain/communication/room/room.interface';
import { IPost } from '@domain/collaboration/post';

export interface NotificationInputCalloutPostContributionComment
  extends NotificationInputBase {
  post: IPost;
  room: IRoom;
  commentSent: IMessage;
}
