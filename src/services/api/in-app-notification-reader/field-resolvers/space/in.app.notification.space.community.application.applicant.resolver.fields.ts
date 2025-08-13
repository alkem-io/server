import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { InAppNotificationEntrySpaceCommunityApplicationApplicant } from '../../dto/space/in.app.notification.entry.space.community.application.applicant';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';

@Resolver(() => InAppNotificationEntrySpaceCommunityApplicationApplicant)
export class InAppNotificationSpaceCommunityApplicationApplicantResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that applied.',
  })
  public contributor(
    @Parent()
    { payload }: InAppNotificationEntrySpaceCommunityApplicationApplicant,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.triggeredByID);
  }

  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'The Space that the application was made to.',
  })
  public space(
    @Parent()
    { payload }: InAppNotificationEntrySpaceCommunityApplicationApplicant,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace | null>
  ) {
    return loader.load(payload.spaceID);
  }
}
