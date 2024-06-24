import { IDiscussion } from '@platform/forum-discussion/discussion.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputForumDiscussionCreated
  extends NotificationInputBase {
  discussion: IDiscussion;
}
