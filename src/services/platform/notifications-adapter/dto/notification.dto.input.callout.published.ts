import { ICallout } from '@domain/collaboration/callout';
import { NotificationInputBase } from './notification.dto.input.base';

export class NotificationInputCalloutPublished extends NotificationInputBase {
  callout!: ICallout;
}
