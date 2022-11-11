import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputCalloutDiscussionComment extends ActivityInputBase {
  callout!: ICallout;
  message!: string;
}
