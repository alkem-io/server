import { IPost } from '@domain/collaboration/post/post.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputCalloutPostCreated extends ActivityInputBase {
  post!: IPost;
  callout!: ICallout;
}
