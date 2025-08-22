import { IMessage } from '@domain/communication/message/message.interface';
import { NotificationInputBase } from '../notification.dto.input.base';
import { IDiscussion } from '@platform/forum-discussion/discussion.interface';

export interface NotificationInputPlatformForumDiscussionComment
  extends NotificationInputBase {
  discussion: IDiscussion;
  commentSent: IMessage;
}
