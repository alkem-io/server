import { ICallout } from '@domain/collaboration/callout';
import { ActivityInputBase } from './activity.dto.input.base';
import { IReference } from '@domain/common/reference/reference.interface';

export class ActivityInputCalloutLinkCreated extends ActivityInputBase {
  callout!: ICallout;
  reference!: IReference;
}
