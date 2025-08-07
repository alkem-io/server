import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { InAppNotificationEntryCommunityNewMember } from '../dto/in.app.notification.entry.community.new.member';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';

@Resolver(() => InAppNotificationEntryCommunityNewMember)
export class InAppNotificationCommunityNewMemberResolverFields {
  @ResolveField(() => RoleSetContributorType, {
    nullable: false,
    description: 'The type of the Contributor that joined.',
  })
  public contributorType(
    @Parent() { payload }: InAppNotificationEntryCommunityNewMember
  ) {
    return payload.contributorType;
  }

  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that joined.',
  })
  // todo: rename?
  public actor(
    @Parent() { payload }: InAppNotificationEntryCommunityNewMember,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.newMemberID);
  }

  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'The Space that was joined.',
  })
  public space(
    @Parent() { payload }: InAppNotificationEntryCommunityNewMember,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace | null>
  ) {
    return loader.load(payload.spaceID);
  }
}
