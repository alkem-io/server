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
    nullable: false,
    description: 'The Callout that was published.',
  })
  public callout(
    @Parent() { payload }: InAppNotificationCalloutPublished,
    @Loader(CalloutLoaderCreator) loader: ILoader<ICallout>
  ) {
    return loader.load(payload.calloutID);
  }

  @ResolveField(() => ISpace, {
    nullable: false,
    description: 'Where the callout is located.',
  })
  public space(
    @Parent() { payload }: InAppNotificationCalloutPublished,
    @Loader(SpaceLoaderCreator) loader: ILoader<ISpace>
  ) {
    return loader.load(payload.spaceID);
  }
}
