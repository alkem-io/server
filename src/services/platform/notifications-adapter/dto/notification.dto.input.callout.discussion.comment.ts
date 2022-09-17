import { ICallout } from '@domain/collaboration/callout';
import { NotificationInputBase } from './notification.dto.input.base';

export class NotificationInputCalloutDiscussionComment extends NotificationInputBase {
  callout!: ICallout;
  message!: string;
}
