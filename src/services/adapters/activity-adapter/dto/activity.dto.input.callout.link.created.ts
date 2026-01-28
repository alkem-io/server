import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ILink } from '@domain/collaboration/link/link.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputCalloutLinkCreated extends ActivityInputBase {
  callout!: ICallout;
  link!: ILink;
}
