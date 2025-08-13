import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationSpaceCollaborationPostCreatedAdminPayload } from '@services/adapters/notification-in-app-adapter/dto/space/notification.in.app.space.collaboration.post.created.admin.payload';

@ObjectType('InAppNotificationSpaceCollaborationPostCreatedAdmin', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntrySpaceCollaborationPostCreatedAdmin extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.SPACE_COLLABORATION_POST_CREATED_ADMIN;
  declare payload: InAppNotificationSpaceCollaborationPostCreatedAdminPayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  space?: ISpace;
  post?: string;
  callout?: string;
}
