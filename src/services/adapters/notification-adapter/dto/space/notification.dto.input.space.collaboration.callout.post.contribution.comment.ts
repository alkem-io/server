import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ICalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.interface';
import { IPost } from '@domain/collaboration/post';
import { IMessage } from '@domain/communication/message/message.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputCollaborationCalloutPostContributionComment
  extends NotificationInputBase {
  callout: ICallout;
  post: IPost;
  contribution: ICalloutContribution;
  room: IRoom;
  commentSent: IMessage;
  mentionedUserIDs?: string[];
}
