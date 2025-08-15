import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationUserCommentReplyPayload } from '@platform/in-app-notification/dto/user/notification.in.app.user.comment.reply.payload';

@ObjectType('InAppNotificationUserCommentReply', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntryUserCommentReply extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.USER_COMMENT_REPLY;
  declare payload: InAppNotificationUserCommentReplyPayload;
  // fields resolved by a concrete resolver
  contributorType!: RoleSetContributorType;
  contributor?: IContributor;
  comment?: string;
  commentUrl?: string;
}
