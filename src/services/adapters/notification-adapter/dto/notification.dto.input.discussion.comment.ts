import { ICallout } from '@domain/collaboration/callout';
import { IComments } from '@domain/communication/comments/comments.interface';
import { IMessage } from '@domain/communication/message/message.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputDiscussionComment
  extends NotificationInputBase {
  callout: ICallout;
  comments: IComments;
  commentSent: IMessage;
}
