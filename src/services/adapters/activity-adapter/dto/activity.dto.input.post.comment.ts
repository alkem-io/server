import { IPost } from '@domain/collaboration/post/post.interface';
import { IMessage } from '@domain/communication/message/message.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputPostComment extends ActivityInputBase {
  post!: IPost;
  message!: IMessage;
}
