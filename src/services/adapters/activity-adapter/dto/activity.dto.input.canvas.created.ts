import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ICanvas } from '@domain/common/canvas/canvas.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputCanvasCreated extends ActivityInputBase {
  canvas!: ICanvas;
  callout!: ICallout;
}
