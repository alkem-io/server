import { IAspect } from '@domain/collaboration';
import { IComments } from '@domain/communication/comments/comments.interface';
import { CommunicationMessageResult } from '@domain/communication/message/communication.dto.message.result';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputAspectComment extends NotificationInputBase {
  aspect: IAspect;
  comments: IComments;
  commentSent: CommunicationMessageResult;
}
