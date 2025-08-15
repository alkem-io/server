import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { InAppNotificationPayloadSpaceCommunicationMessageSender } from '../../dto/space/in.app.notification.entry.space.communication.message.sender';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';

@Resolver(() => InAppNotificationPayloadSpaceCommunicationMessageSender)
export class InAppNotificationSpaceCommunicationMessageSenderResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that sent the message.',
  })
  public contributor(
    @Parent()
    payload: InAppNotificationPayloadSpaceCommunicationMessageSender,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.triggeredByID);
  }

  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'The Space where the message was sent.',
  })
  public space(
    @Parent()
    payload: InAppNotificationPayloadSpaceCommunicationMessageSender,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace | null>
  ) {
    return loader.load(payload.spaceID);
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The message content.',
  })
  public message(
    @Parent()
    payload: InAppNotificationPayloadSpaceCommunicationMessageSender
  ): string {
    return payload.message.messageID;
  }
}
