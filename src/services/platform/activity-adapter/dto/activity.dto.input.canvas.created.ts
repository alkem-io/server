import { ICanvas } from '@domain/common/canvas';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputCanvasCreated extends ActivityInputBase {
  canvas!: ICanvas;
}
