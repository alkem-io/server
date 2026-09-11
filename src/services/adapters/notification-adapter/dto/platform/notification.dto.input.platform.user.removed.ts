import type { UserPayload } from '@alkemio/notifications-lib/dist/dto/user.payload';
import { IUser } from '@domain/community/user/user.interface';
import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputPlatformUserRemoved
  extends NotificationInputBase {
  user: IUser;
  /**
   * On the self branch of account deletion the initiator IS `user`, whose
   * row is already gone from the primary store by the time this
   * best-effort notification runs. Pre-resolved from the pre-deletion
   * entity so building the notification payload never has to look the
   * (now-deleted) initiator up by id.
   */
  triggeredByPayload?: UserPayload;
}
