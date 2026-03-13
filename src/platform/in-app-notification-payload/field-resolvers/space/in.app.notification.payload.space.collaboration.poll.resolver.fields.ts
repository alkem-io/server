import {
  CalloutLoaderCreator,
  SpaceLoaderCreator,
} from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InAppNotificationPayloadSpaceCollaborationPoll } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.collaboration.poll';

@Resolver(() => InAppNotificationPayloadSpaceCollaborationPoll)
export class InAppNotificationPayloadSpaceCollaborationPollResolverFields {
  @ResolveField(() => ICallout, {
    nullable: false,
    description: 'The Callout that contains the poll.',
  })
  public callout(
    @Parent() payload: InAppNotificationPayloadSpaceCollaborationPoll,
    @Loader(CalloutLoaderCreator) loader: ILoader<ICallout>
  ): Promise<ICallout> {
    return loader.load(payload.calloutID);
  }

  @ResolveField(() => ISpace, {
    nullable: false,
    description: 'Where the callout is located.',
  })
  public space(
    @Parent() payload: InAppNotificationPayloadSpaceCollaborationPoll,
    @Loader(SpaceLoaderCreator) loader: ILoader<ISpace>
  ): Promise<ISpace> {
    return loader.load(payload.spaceID);
  }
}
