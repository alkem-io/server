import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotificationEntrySpaceCollaborationCalloutPublished } from '@services/api/in-app-notification-reader/dto/in.app.notification.entry.space.collaboration.callout.published';
import { ISpace } from '@domain/space/space/space.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Loader } from '@core/dataloader/decorators';
import {
  CalloutLoaderCreator,
  SpaceLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';

@Resolver(() => InAppNotificationEntrySpaceCollaborationCalloutPublished)
export class InAppNotificationCalloutPublishedResolverFields {
  @ResolveField(() => ICallout, {
    nullable: true,
    description: 'The Callout that was published.',
  })
  public callout(
    @Parent()
    { payload }: InAppNotificationEntrySpaceCollaborationCalloutPublished,
    @Loader(CalloutLoaderCreator, { resolveToNull: true })
    loader: ILoader<ICallout>
  ) {
    return loader.load(payload.calloutID);
  }

  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'Where the callout is located.',
  })
  public space(
    @Parent()
    { payload }: InAppNotificationEntrySpaceCollaborationCalloutPublished,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace>
  ) {
    return loader.load(payload.spaceID);
  }
}
