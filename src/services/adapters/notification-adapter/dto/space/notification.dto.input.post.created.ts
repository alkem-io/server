import { IPost } from '@domain/collaboration/post/post.interface';
import { NotificationInputContributionCreated } from './notification.dto.input.contribution.created';

export interface NotificationInputPostCreated
  extends NotificationInputContributionCreated {
  post: IPost;
}
