import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotificationPayloadUserMessageDirect } from '@platform/in-app-notification/dto/payload/user/notification.in.app.payload.user.message.direct';
import { InAppNotificationPayloadUserMessageRoom } from '@platform/in-app-notification/dto/payload/user/notification.in.app.payload.user.message.room';

@Resolver(() => InAppNotificationPayloadUserMessageRoom)
export class InAppNotificationUserMessageRoomResolverFields {
  @ResolveField(() => String, {
    nullable: true,
    description: 'The original message ID.',
  })
  public originalMessageID(
    @Parent()
    payload: InAppNotificationPayloadUserMessageRoom
  ): string {
    return payload.messageID;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The room for the message.',
  })
  public roomID(
    @Parent()
    payload: InAppNotificationPayloadUserMessageRoom
  ): string {
    return payload.roomID;
  }

  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The User for the message.',
  })
  public async user(
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>,
    @Parent()
    payload: InAppNotificationPayloadUserMessageDirect
  ): Promise<IContributor | null> {
    return loader.load(payload.userID);
  }
}
