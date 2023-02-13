import { CommentType } from '@common/enums/comment.type';
import { Mention } from '@domain/communication/messaging/mention.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputEntityMentions extends NotificationInputBase {
  comment: string;
  commentsId: string;
  originEntity: {
    id: string;
    nameId: string;
    displayName: string;
  };
  commentType: CommentType;
  mentions: Mention[];
}
