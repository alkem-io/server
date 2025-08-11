import { NotificationInputBase } from '../notification.dto.input.base';
import { ISpace } from '@domain/space/space/space.interface';

export interface NotificationInputSpaceCreated extends NotificationInputBase {
  space: ISpace;
}
