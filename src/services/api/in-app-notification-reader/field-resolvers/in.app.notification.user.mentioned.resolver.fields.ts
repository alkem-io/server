import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { InAppNotificationEntryUserMentioned } from '../dto/in.app.notification.entry.user.mentioned';

@Resolver(() => InAppNotificationEntryUserMentioned)
export class InAppNotificationUserMentionedResolverFields {
  @ResolveField(() => RoleSetContributorType, {
    nullable: false,
    description: 'The type of the Contributor that joined.',
  })
  public contributorType(
    @Parent() { payload }: InAppNotificationEntryUserMentioned
  ): RoleSetContributorType {
    return payload.contributorType as RoleSetContributorType;
  }

  @ResolveField(() => String, {
    nullable: false,
    description: 'The comment that the contributor was mentioned in.',
  })
  public comment(
    @Parent() { payload }: InAppNotificationEntryUserMentioned
  ): string {
    return payload.comment;
  }

  @ResolveField(() => String, {
    nullable: false,
    description: 'The url of the resource where the comment was created.',
  })
  public commentUrl(
    @Parent() { payload }: InAppNotificationEntryUserMentioned
  ): string {
    return payload.commentOrigin.url;
  }

  @ResolveField(() => String, {
    nullable: false,
    description:
      'The display name of the resource where the comment was created.',
  })
  public commentOriginName(
    @Parent() { payload }: InAppNotificationEntryUserMentioned
  ): string {
    return payload.commentOrigin.displayName;
  }
}
