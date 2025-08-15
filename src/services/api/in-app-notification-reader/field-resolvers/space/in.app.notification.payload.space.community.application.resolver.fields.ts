import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { ISpace } from '@domain/space/space/space.interface';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';
import { InAppNotificationPayloadSpaceCommunityApplication } from '@platform/in-app-notification/dto/payload/space/notification.in.app.payload.space.community.application';

@Resolver(() => InAppNotificationPayloadSpaceCommunityApplication)
export class InAppNotificationSpaceCommunityApplicationApplicantResolverFields {
  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'The Space that the application was made to.',
  })
  public space(
    @Parent()
    payload: InAppNotificationPayloadSpaceCommunityApplication,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace | null>
  ) {
    return loader.load(payload.spaceID);
  }
}
