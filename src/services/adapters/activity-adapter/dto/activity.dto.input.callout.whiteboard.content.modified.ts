import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputCalloutWhiteboardContentModified extends ActivityInputBase {
  whiteboard!: IWhiteboard;
}
