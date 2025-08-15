import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotificationEntryUserCommentReply } from '../../dto/user/in.app.notification.entry.user.comment.reply';
@Resolver(() => InAppNotificationEntryUserCommentReply)
export class InAppNotificationUserCommentReplyResolverFields {
  @ResolveField(() => String, {
    nullable: true,
    description: 'The original message ID.',
  })
  public originalMessageID(
    @Parent()
    { payload }: InAppNotificationEntryUserCommentReply
  ): string {
    return payload.originalMessage.messageID;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The reply message ID.',
  })
  public replyMessageID(
    @Parent()
    { payload }: InAppNotificationEntryUserCommentReply
  ): string {
    return payload.replyMessage.messageID;
  }
}
