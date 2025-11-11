import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { ISpace } from '@domain/space/space/space.interface';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';
import { InAppNotificationPayloadSpaceCommunityApplication } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.application';
import { IApplication } from '@domain/access/application';
import { RoleSetApplicationLoaderCreator } from '@core/dataloader/creators/loader.creators/roleset.application.loader.creator';

@Resolver(() => InAppNotificationPayloadSpaceCommunityApplication)
export class InAppNotificationPayloadSpaceCommunityApplicationResolverFields {
  @ResolveField(() => ISpace, {
    nullable: false,
    description: 'The Space that the application was made to.',
  })
  public space(
    @Parent()
    payload: InAppNotificationPayloadSpaceCommunityApplication,
    @Loader(SpaceLoaderCreator)
    loader: ILoader<ISpace>
  ) {
    return loader.load(payload.spaceID);
  }

  // Add in resolver for Application
  @ResolveField(() => IApplication, {
    nullable: false,
    description: 'The Application that the notification is related to.',
  })
  public application(
    @Parent()
    payload: InAppNotificationPayloadSpaceCommunityApplication,
    @Loader(RoleSetApplicationLoaderCreator)
    loader: ILoader<IApplication>
  ) {
    return loader.load(payload.applicationID);
  }
}
