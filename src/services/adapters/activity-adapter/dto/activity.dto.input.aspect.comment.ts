import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputAspectComment extends ActivityInputBase {
  aspect!: IAspect;
  message!: string;
}
