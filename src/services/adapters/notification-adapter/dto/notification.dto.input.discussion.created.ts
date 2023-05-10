import { IDiscussion } from '@domain/communication/discussion/discussion.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputForumDiscussionCreated
  extends NotificationInputBase {
  discussion: IDiscussion;
}
