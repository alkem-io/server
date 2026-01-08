import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IMessage } from '@domain/communication/message/message.interface';
import { NotificationInputBase } from '../notification.dto.input.base';
import { IRoom } from '@domain/communication/room/room.interface';

export interface NotificationInputCollaborationCalloutComment
  extends NotificationInputBase {
  callout: ICallout;
  comments: IRoom;
  commentSent: IMessage;
  mentionedUserIDs?: string[];
}
