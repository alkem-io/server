import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { InAppNotificationUserMentioned } from '../dto/in.app.notification.user.mentioned';

@Resolver(() => InAppNotificationUserMentioned)
export class InAppNotificationUserMentionedResolverFields {
  @ResolveField(() => RoleSetContributorType, {
    nullable: false,
    description: 'The type of the Contributor that joined.',
  })
  public contributorType(
    @Parent() { payload }: InAppNotificationUserMentioned
  ): RoleSetContributorType {
    return payload.contributorType as unknown as RoleSetContributorType; // todo this might be wrong - the types dont match
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

  @ResolveField(() => String, {
    nullable: false,
    description: 'The url of the resource where the comment was created.',
  })
  public commentUrl(
    @Parent() { payload }: InAppNotificationUserMentioned
  ): string {
    return payload.commentOrigin.url;
  }

  @ResolveField(() => String, {
    nullable: false,
    description:
      'The display name of the resource where the comment was created.',
  })
  public commentOriginName(
    @Parent() { payload }: InAppNotificationUserMentioned
  ): string {
    return payload.commentOrigin.displayName;
  }
}
