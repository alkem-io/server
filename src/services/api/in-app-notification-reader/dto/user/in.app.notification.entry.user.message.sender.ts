import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationUserMessageSenderPayload } from '@services/adapters/notification-in-app-adapter/dto/user/notification.in.app.user.message.sender.payload';

@ObjectType('InAppNotificationUserMessageSender', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntryUserMessageSender extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.USER_MESSAGE_SENDER;
  declare payload: InAppNotificationUserMessageSenderPayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  user?: IContributor;
  message?: string;
}
