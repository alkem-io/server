import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { InAppNotificationEntrySpaceCommunicationUpdate } from '../../dto/space/in.app.notification.entry.space.communication.update';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';

@Resolver(() => InAppNotificationEntrySpaceCommunicationUpdate)
export class InAppNotificationSpaceCommunicationUpdateResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that sent the update.',
  })
  public contributor(
    @Parent()
    { payload }: InAppNotificationEntrySpaceCommunicationUpdate,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.triggeredByID);
  }

  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'The Space where the update was sent.',
  })
  public space(
    @Parent()
    { payload }: InAppNotificationEntrySpaceCommunicationUpdate,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace | null>
  ) {
    return loader.load(payload.spaceID);
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The update content.',
  })
  public update(
    @Parent()
    { payload }: InAppNotificationEntrySpaceCommunicationUpdate
  ): string {
    return payload.updateID;
  }
}
