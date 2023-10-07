import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { NotificationInputContributionCreated } from './notification.dto.input.contribution.created';

export interface NotificationInputWhiteboardCreated
  extends NotificationInputContributionCreated {
  whiteboard: IWhiteboard;
}
