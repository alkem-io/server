import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotificationCalloutPublished } from '@domain/in-app-notification-reader/dto/in.app.notification.callout.published';
import { ISpace } from '@domain/space/space/space.interface';
import { ICallout } from '@domain/collaboration/callout';
import { Loader } from '@core/dataloader/decorators';
import {
  CalloutLoaderCreator,
  SpaceLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';

@Resolver(() => InAppNotificationCalloutPublished)
export class InAppNotificationCalloutPublishedResolverFields {
  @ResolveField(() => ICallout, {
    nullable: true,
    description: 'The Callout that was published.',
  })
  public callout(
    @Parent() { payload }: InAppNotificationCalloutPublished,
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
    @Parent() { payload }: InAppNotificationCalloutPublished,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace>
  ) {
    return loader.load(payload.spaceID);
  }
}
