import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { NotificationInputContributionCreated } from './notification.dto.input.space.collaboration.contribution.created';

export interface NotificationInputWhiteboardCreated
  extends NotificationInputContributionCreated {
  whiteboard: IWhiteboard;
}
