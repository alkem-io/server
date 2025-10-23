import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputUserSpaceCommunityApplicationDeclined
  extends NotificationInputBase {
  userID: string;
  spaceID: string;
}
