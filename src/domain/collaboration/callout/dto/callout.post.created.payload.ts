import { BaseSubscriptionPayload } from '@src/common/interfaces/base.subscription.payload.interface';
import { IPost } from '@src/domain/collaboration/post/post.interface';

export interface CalloutPostCreatedPayload extends BaseSubscriptionPayload {
  calloutID: string;
  contributionID: string;
  sortOrder: number;
  post: IPost;
}
