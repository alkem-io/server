import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { InAppNotificationUserMentioned } from '../dto/in.app.notification.user.mentioned';

@Resolver(() => InAppNotificationUserMentioned)
export class InAppNotificationUserMentionedResolverFields {
  @ResolveField(() => CommunityContributorType, {
    nullable: false,
    description: 'The type of the Contributor that joined.',
  })
  public contributorType(
    @Parent() { payload }: InAppNotificationUserMentioned
  ): CommunityContributorType {
    return payload.contributorType as unknown as CommunityContributorType; // todo this might be wrong - the types dont match
  }

  @ResolveField(() => String, {
    nullable: false,
    description: 'The comment that the contributor was mentioned in.',
  })
  public comment(
    @Parent() { payload }: InAppNotificationUserMentioned
  ): string {
    return payload.comment;
  }
}
