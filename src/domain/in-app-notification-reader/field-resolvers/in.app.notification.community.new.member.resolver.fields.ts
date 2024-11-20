import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { InAppNotificationCommunityNewMember } from '../dto/in.app.notification.community.new.member';
import { InAppNotification } from '../in.app.notification.interface';

@Resolver(() => InAppNotificationCommunityNewMember)
export class InAppNotificationCommunityNewMemberResolverFields {
  @ResolveField(() => CommunityContributorType, {
    nullable: false,
    description: 'The type of the Contributor that joined.',
  })
  public contributorType(@Parent() notification: InAppNotification) {
    return null; // todo dataloader
  }

  @ResolveField(() => IContributor, {
    nullable: false, // false
    description: 'The Contributor that joined.',
  })
  // todo: rename?
  public actor(@Parent() notification: InAppNotification) {
    return null; // todo dataloader
  }

  @ResolveField(() => ISpace, {
    nullable: false,
    description: 'The Space that was joined.',
  })
  public space(@Parent() notification: InAppNotification) {
    return null; // todo dataloader
  }
}
