import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IInnovationHxb } from '@domain/innovation-hub/innovation.hub.interface';
import { InnovationHxbService } from '@domain/innovation-hub/innovation.hub.service';
import { IHub } from '@domain/challenge/hub/hub.interface';
import { HubService } from '@domain/challenge/hub/hub.service';
import { IProfile } from '@domain/common/profile';
import { Profiling } from '@common/decorators';
import { Loader } from '@core/dataloader/decorators';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { InnovationHxb } from '@domain/innovation-hub/innovation.hub.entity';

@Resolver(() => IInnovationHxb)
export class InnovationHxbFieldResolver {
  constructor(
    private hubService: InnovationHxbService,
    private spaceService: HubService
  ) {}

  @ResolveField(() => [IHub], {
    nullable: true,
  })
  public async hubListFilter(
    @Parent() hub: IInnovationHxb
  ): Promise<IHub[] | undefined> {
    const filter = await this.hubService.getSpaceListFilterOrFail(hub.id);

    if (!filter) {
      return undefined;
    }

    return this.spaceService.getHubsById(filter);
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Innovation Hxb profile.',
  })
  @Profiling.api
  async profile(
    @Parent() hub: InnovationHxb,
    @Loader(ProfileLoaderCreator, { parentClassRef: InnovationHxb })
    loader: ILoader<IProfile>
  ) {
    return loader.load(hub.id);
  }
}
