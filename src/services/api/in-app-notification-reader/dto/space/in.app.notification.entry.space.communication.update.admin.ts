import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationSpaceCommunicationUpdateAdminPayload } from '@services/adapters/notification-in-app-adapter/dto/space/notification.in.app.space.communication.update.admin.payload';

@ObjectType('InAppNotificationSpaceCommunicationUpdateAdmin', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntrySpaceCommunicationUpdateAdmin extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.SPACE_COMMUNICATION_UPDATE_ADMIN;
  declare payload: InAppNotificationSpaceCommunicationUpdateAdminPayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  space?: ISpace;
  update?: string;
}
