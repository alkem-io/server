import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationSpaceCommunicationMessageRecipientPayload } from '@platform/in-app-notification/dto/space/notification.in.app.space.communication.message.recipient.payload';

@ObjectType('InAppNotificationSpaceCommunicationMessageRecipient', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntrySpaceCommunicationMessageRecipient extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.SPACE_COMMUNICATION_MESSAGE_RECIPIENT;
  declare payload: InAppNotificationSpaceCommunicationMessageRecipientPayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  space?: ISpace;
  message?: string;
}
