import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IMessage } from '@domain/communication/message/message.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputCalloutDiscussionComment extends ActivityInputBase {
  callout!: ICallout;
  message!: IMessage;
}
