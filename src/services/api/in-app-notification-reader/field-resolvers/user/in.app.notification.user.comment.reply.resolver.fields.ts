import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { InAppNotificationEntryUserCommentReply } from '../../dto/user/in.app.notification.entry.user.comment.reply';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';

@Resolver(() => InAppNotificationEntryUserCommentReply)
export class InAppNotificationUserCommentReplyResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that replied to the comment.',
  })
  public contributor(
    @Parent()
    { payload }: InAppNotificationEntryUserCommentReply,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.triggeredByID);
  }

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
