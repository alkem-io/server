import { Resolver, ResolveField, Parent, Info } from '@nestjs/graphql';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { InAppNotification } from '../in.app.notification.interface';
import { InAppNotificationUserMentioned } from '../dto/in.app.notification.user.mentioned';
import { GraphQLResolveInfo } from 'graphql';

@Resolver(() => InAppNotificationUserMentioned)
export class InAppNotificationUserMentionedResolverFields {
  @ResolveField(() => CommunityContributorType, {
    nullable: false,
    description: 'The type of the Contributor that joined.',
  })
  public contributorType(
    @Parent() { payload }: InAppNotification,
    @Info() info: GraphQLResolveInfo
  ) {
    return null; // todo dataloader
  }
}
