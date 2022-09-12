import { IAspect } from '@domain/collaboration';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputAspectComment extends ActivityInputBase {
  aspect!: IAspect;
}
