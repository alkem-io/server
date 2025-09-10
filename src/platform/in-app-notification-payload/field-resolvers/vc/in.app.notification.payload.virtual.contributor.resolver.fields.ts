import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InAppNotificationPayloadVirtualContributor } from '../../dto/virtual-contributor/notification.in.app.payload.virtual.contributor';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { Loader } from '@core/dataloader/decorators';
import { ContributorLoaderCreator } from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';

@Resolver(() => InAppNotificationPayloadVirtualContributor)
export class InAppNotificationPayloadVirtualContributorFieldsResolver {
  @ResolveField(() => IVirtualContributor, { nullable: true })
  async contributor(
    @Parent() payload: InAppNotificationPayloadVirtualContributor,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IVirtualContributor | null>
  ): Promise<IVirtualContributor | null> {
    return loader.load(payload.virtualContributorID);
  }
}
