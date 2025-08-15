import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationSpaceCommunicationUpdatePayload } from '@platform/in-app-notification/dto/space/notification.in.app.space.communication.update.payload';

@ObjectType('InAppNotificationSpaceCommunicationUpdate', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntrySpaceCommunicationUpdate extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.SPACE_COMMUNICATION_UPDATE;
  declare payload: InAppNotificationSpaceCommunicationUpdatePayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  space?: ISpace;
  update?: string;
}
