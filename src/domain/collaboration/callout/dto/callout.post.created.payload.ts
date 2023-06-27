import { IPost } from '@src/domain/collaboration/post/post.interface';
import { BaseSubscriptionPayload } from '@src/common/interfaces/base.subscription.payload.interface';

export interface CalloutPostCreatedPayload extends BaseSubscriptionPayload {
  calloutID: string;
  post: IPost;
}
