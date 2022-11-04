import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputAspectCreated extends ActivityInputBase {
  aspect!: IAspect;
  callout!: ICallout;
}
