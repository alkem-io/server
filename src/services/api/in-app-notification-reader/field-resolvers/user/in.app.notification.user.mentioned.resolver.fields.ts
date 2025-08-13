import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotificationEntryUserMentioned } from '../../dto/user/in.app.notification.entry.user.mentioned';

@Resolver(() => InAppNotificationEntryUserMentioned)
export class InAppNotificationUserMentionedResolverFields {
  @ResolveField(() => String, {
    nullable: false,
    description: 'The comment that the contributor was mentioned in.',
  })
  public comment(
    @Parent() { payload }: InAppNotificationEntryUserMentioned
  ): string {
    return payload.message.messageID; // TODO: this should be a comment object, not just a string
  }

  @ResolveField(() => String, {
    nullable: false,
    description: 'The url of the resource where the comment was created.',
  })
  public commentUrl(
    @Parent() { payload }: InAppNotificationEntryUserMentioned
  ): string {
    return payload.message.roomID; // TODO: this URL should NOT be part of data in InApp data
  }

  @ResolveField(() => String, {
    nullable: false,
    description:
      'The display name of the resource where the comment was created.',
  })
  public commentOriginName(
    @Parent() { payload }: InAppNotificationEntryUserMentioned
  ): string {
    return payload.message.roomID; // TODO
  }
}
