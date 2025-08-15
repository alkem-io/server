import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPlatformSpaceCreatedPayload } from '@platform/in-app-notification/dto/platform/notification.in.app.platform.space.created.payload';

@ObjectType('InAppNotificationPlatformSpaceCreated', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntryPlatformSpaceCreated extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.PLATFORM_SPACE_CREATED;
  declare payload: InAppNotificationPlatformSpaceCreatedPayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  space?: ISpace;
}
