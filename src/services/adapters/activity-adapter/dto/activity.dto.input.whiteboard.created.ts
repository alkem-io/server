import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputWhiteboardCreated extends ActivityInputBase {
  whiteboard!: IWhiteboard;
  callout!: ICallout;
}
