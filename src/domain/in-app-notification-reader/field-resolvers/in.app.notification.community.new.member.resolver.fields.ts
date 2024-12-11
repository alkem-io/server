import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { InAppNotificationCommunityNewMember } from '../dto/in.app.notification.community.new.member';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';

@Resolver(() => InAppNotificationCommunityNewMember)
export class InAppNotificationCommunityNewMemberResolverFields {
  @ResolveField(() => CommunityContributorType, {
    nullable: false,
    description: 'The type of the Contributor that joined.',
  })
  public contributorType(
    @Parent() { payload }: InAppNotificationCommunityNewMember
  ) {
    return payload.contributorType;
  }

  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that joined.',
  })
  // todo: rename?
  public actor(
    @Parent() { payload }: InAppNotificationCommunityNewMember,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor>
  ) {
    return loader.load(payload.newMemberID);
  }

  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'The Space that was joined.',
  })
  public space(
    @Parent() { payload }: InAppNotificationCommunityNewMember,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace>
  ) {
    return loader.load(payload.spaceID);
  }
}
