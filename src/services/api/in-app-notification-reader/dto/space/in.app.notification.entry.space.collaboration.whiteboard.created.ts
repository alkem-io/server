import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationSpaceCollaborationWhiteboardCreatedPayload } from '@services/adapters/notification-in-app-adapter/dto/space/notification.in.app.space.collaboration.whiteboard.created.payload';

@ObjectType('InAppNotificationSpaceCollaborationWhiteboardCreated', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntrySpaceCollaborationWhiteboardCreated extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.SPACE_COLLABORATION_WHITEBOARD_CREATED;
  declare payload: InAppNotificationSpaceCollaborationWhiteboardCreatedPayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  space?: ISpace;
  whiteboard?: string;
  callout?: string;
}
