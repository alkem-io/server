import {
  CalloutLoaderCreator,
  PollLoaderCreator,
  SpaceLoaderCreator,
} from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IPoll } from '@domain/collaboration/poll/poll.interface';
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

  @ResolveField(() => IPoll, {
    nullable: false,
    description: 'The Poll this notification relates to.',
  })
  public poll(
    @Parent() payload: InAppNotificationPayloadSpaceCollaborationPoll,
    @Loader(PollLoaderCreator) loader: ILoader<IPoll>
  ): Promise<IPoll> {
    return loader.load(payload.pollID);
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
