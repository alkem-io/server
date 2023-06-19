import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputWhiteboardCreated
  extends NotificationInputBase {
  whiteboard: IWhiteboard;
}
