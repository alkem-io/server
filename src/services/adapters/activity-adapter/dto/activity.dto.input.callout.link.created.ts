import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ActivityInputBase } from './activity.dto.input.base';
import { ILink } from '@domain/collaboration/link/link.interface';

export class ActivityInputCalloutLinkCreated extends ActivityInputBase {
  callout!: ICallout;
  link!: ILink;
}
