import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationSpaceCommunicationMessageSenderPayload } from '@services/adapters/notification-in-app-adapter/dto/space/notification.in.app.space.communication.message.sender.payload';

@ObjectType('InAppNotificationSpaceCommunicationMessageSender', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntrySpaceCommunicationMessageSender extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.SPACE_COMMUNICATION_MESSAGE_SENDER;
  declare payload: InAppNotificationSpaceCommunicationMessageSenderPayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  space?: ISpace;
  message?: string;
}
