import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationUserMessageRecipientPayload } from '@services/adapters/notification-in-app-adapter/dto/user/notification.in.app.user.message.recipient.payload';

@ObjectType('InAppNotificationUserMessageRecipient', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntryUserMessageRecipient extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.USER_MESSAGE_RECIPIENT;
  declare payload: InAppNotificationUserMessageRecipientPayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  user?: IContributor;
  message?: string;
}
