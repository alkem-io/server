import { IAspect } from '@domain/collaboration';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputAspectCreated extends NotificationInputBase {
  aspect: IAspect;
}
