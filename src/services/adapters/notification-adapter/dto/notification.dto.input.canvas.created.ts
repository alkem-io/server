import { ICanvas } from '@domain/common/canvas/canvas.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputCanvasCreated extends NotificationInputBase {
  canvas: ICanvas;
}
