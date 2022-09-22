import { ICallout } from '@domain/collaboration/callout';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputCalloutPublished
  extends NotificationInputBase {
  callout: ICallout;
}
