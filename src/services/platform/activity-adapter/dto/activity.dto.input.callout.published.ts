import { ICallout } from '@domain/collaboration/callout';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputCalloutPublished extends ActivityInputBase {
  callout!: ICallout;
}
