import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InAppNotificationPayloadVirtualContributor } from '../../dto/virtual-contributor/notification.in.app.payload.virtual.contributor';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { Loader } from '@core/dataloader/decorators';
import {
  ContributorLoaderCreator,
  SpaceLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { ISpace } from '@domain/space/space/space.interface';

@Resolver(() => InAppNotificationPayloadVirtualContributor)
export class InAppNotificationPayloadVirtualContributorFieldsResolver {
  @ResolveField(() => IVirtualContributor, {
    nullable: false,
  })
  async contributor(
    @Parent() payload: InAppNotificationPayloadVirtualContributor,
    @Loader(ContributorLoaderCreator)
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
