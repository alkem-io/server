import { ISpace } from '@domain/space/space/space.interface';
import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputSpaceCreated extends NotificationInputBase {
  space: ISpace;
}
