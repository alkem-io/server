import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { ISpace } from '@domain/space/space/space.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Loader } from '@core/dataloader/decorators';
import {
  CalloutLoaderCreator,
  SpaceLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { InAppNotificationPayloadSpaceCollaborationCallout } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.collaboration.callout';

@Resolver(() => InAppNotificationPayloadSpaceCollaborationCallout)
export class InAppNotificationPayloadSpaceCollaborationCalloutResolverFields {
  @ResolveField(() => ICallout, {
    nullable: true,
    description: 'The Callout that was published.',
  })
  public callout(
    @Parent()
    payload: InAppNotificationPayloadSpaceCollaborationCallout,
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
    payload: InAppNotificationPayloadSpaceCollaborationCallout,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace>
  ) {
    return loader.load(payload.spaceID);
  }
}
