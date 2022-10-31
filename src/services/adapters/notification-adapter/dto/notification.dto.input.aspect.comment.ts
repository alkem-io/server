import { IAspect } from '@domain/collaboration';
import { IComments } from '@domain/communication/comments/comments.interface';
import { IMessage } from '@domain/communication/message/message.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputAspectComment extends NotificationInputBase {
  aspect: IAspect;
  comments: IComments;
  commentSent: IMessage;
}
