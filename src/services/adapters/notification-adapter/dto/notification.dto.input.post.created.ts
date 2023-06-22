import { IPost } from '@domain/collaboration/post/post.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputPostCreated extends NotificationInputBase {
  post: IPost;
}
