import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationSpaceCollaborationPostCommentCreatedPayload } from '@platform/in-app-notification/dto/space/notification.in.app.space.collaboration.post.comment.created.payload';

@ObjectType('InAppNotificationSpaceCollaborationPostCommentCreated', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntrySpaceCollaborationPostCommentCreated extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.SPACE_COLLABORATION_POST_COMMENT_CREATED;
  declare payload: InAppNotificationSpaceCollaborationPostCommentCreatedPayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  space?: ISpace;
  post?: string;
  comment?: string;
}
