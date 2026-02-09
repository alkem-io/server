import { IMessage } from '@domain/communication/message/message.interface';
import { IDiscussion } from '@platform/forum-discussion/discussion.interface';
import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputPlatformForumDiscussionComment
  extends NotificationInputBase {
  discussion: IDiscussion;
  commentSent: IMessage;
  userID: string;
}
