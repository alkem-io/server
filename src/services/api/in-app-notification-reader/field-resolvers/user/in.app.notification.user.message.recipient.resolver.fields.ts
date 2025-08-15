import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotificationEntryUserMessageRecipient } from '../../dto/user/in.app.notification.entry.user.message.recipient';

@Resolver(() => InAppNotificationEntryUserMessageRecipient)
export class InAppNotificationUserMessageRecipientResolverFields {
  @ResolveField(() => String, {
    nullable: true,
    description: 'The message content.',
  })
  public message(
    @Parent()
    { payload }: InAppNotificationEntryUserMessageRecipient
  ): string {
    return payload.message;
  }
}
