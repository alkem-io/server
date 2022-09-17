import { IAspect } from '@domain/collaboration';
import { NotificationInputBase } from './notification.dto.input.base';

export class NotificationInputAspectCreated extends NotificationInputBase {
  aspect!: IAspect;
}
