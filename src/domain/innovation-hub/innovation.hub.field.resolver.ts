import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { IHub } from '@domain/challenge/hub/hub.interface';
import { HubService } from '@domain/challenge/hub/hub.service';
import { IProfile } from '@domain/common/profile';
import { Profiling } from '@common/decorators';
import { Loader } from '@core/dataloader/decorators';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';

@Resolver(() => IInnovationHub)
export class InnovationHubFieldResolver {
  constructor(
    private hubService: InnovationHubService,
    private spaceService: HubService
  ) {}

  @ResolveField(() => [IHub])
  public async hubListFilter(@Parent() hub: IInnovationHub): Promise<IHub[]> {
    const filter = await this.hubService.getSpaceListFilterOrFail(hub.id);

    if (!filter) {
      return [];
    }

    return this.spaceService.getHubsById(filter);
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Innovation Hub profile.',
  })
  @Profiling.api
  async profile(
    @Parent() hub: InnovationHub,
    @Loader(ProfileLoaderCreator, { parentClassRef: InnovationHub })
    loader: ILoader<IProfile>
  ) {
    return loader.load(hub.id);
  }
}
