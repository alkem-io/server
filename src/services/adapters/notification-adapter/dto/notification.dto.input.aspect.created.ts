import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputAspectCreated extends NotificationInputBase {
  aspect: IAspect;
}
