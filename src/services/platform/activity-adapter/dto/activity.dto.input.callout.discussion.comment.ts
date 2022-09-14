import { ICallout } from '@domain/collaboration/callout';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputCalloutDiscussionComment extends ActivityInputBase {
  callout!: ICallout;
  message!: string;
}
