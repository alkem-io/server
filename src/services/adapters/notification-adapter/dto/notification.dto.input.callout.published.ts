import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputCalloutPublished
  extends NotificationInputBase {
  callout: ICallout;
}
