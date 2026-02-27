import {
  ActorLoaderCreator,
  SpaceLoaderCreator,
} from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InAppNotificationPayloadVirtualContributor } from '../../dto/virtual-contributor/notification.in.app.payload.virtual.contributor';

@Resolver(() => InAppNotificationPayloadVirtualContributor)
export class InAppNotificationPayloadVirtualContributorFieldsResolver {
  @ResolveField(() => IVirtualContributor, {
    nullable: false,
  })
  async actor(
    @Parent() payload: InAppNotificationPayloadVirtualContributor,
    @Loader(ActorLoaderCreator)
    loader: ILoader<IVirtualContributor>
  ): Promise<IVirtualContributor> {
    return loader.load(payload.virtualContributorID);
  }

  @ResolveField(() => ISpace, {
    nullable: false,
    description: 'The Space related to the notification',
  })
  async space(
    @Parent() payload: InAppNotificationPayloadVirtualContributor,
    @Loader(SpaceLoaderCreator)
    loader: ILoader<ISpace>
  ): Promise<ISpace> {
    return loader.load(payload.space.id);
  }
}
