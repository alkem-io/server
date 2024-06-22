import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceService } from '@domain/space/space/space.service';
import { IProfile } from '@domain/common/profile';
import { Profiling } from '@common/decorators';
import { Loader } from '@core/dataloader/decorators';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { IAccount } from '@domain/space/account/account.interface';
import { AccountLoaderCreator } from '@core/dataloader/creators/loader.creators/account/account.loader.creator';

@Resolver(() => IInnovationHub)
export class InnovationHubFieldResolver {
  constructor(
    private innovationHubService: InnovationHubService,
    private spaceService: SpaceService
  ) {}

  @ResolveField(() => [ISpace], {
    nullable: true,
  })
  public async spaceListFilter(
    @Parent() innovationHub: IInnovationHub
  ): Promise<ISpace[] | undefined> {
    const filter = await this.innovationHubService.getSpaceListFilterOrFail(
      innovationHub.id
    );

    if (!filter) {
      return undefined;
    }

    const spaces = await this.spaceService.getSpacesById(filter);
    const result: ISpace[] = [];
    for (const spaceId of filter) {
      const space = spaces.find(s => s.id === spaceId);
      if (space) result.push(space);
    }
    return result;
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Innovation Hub profile.',
  })
  @Profiling.api
  async profile(
    @Parent() innovationHub: InnovationHub,
    @Loader(ProfileLoaderCreator, { parentClassRef: InnovationHub })
    loader: ILoader<IProfile>
  ) {
    return loader.load(innovationHub.id);
  }

  @ResolveField('account', () => IAccount, {
    nullable: false,
    description: 'The Innovation Hub account.',
  })
  @Profiling.api
  async account(
    @Parent() innovationHub: InnovationHub,
    @Loader(AccountLoaderCreator, { parentClassRef: InnovationHub })
    loader: ILoader<IAccount>
  ) {
    return loader.load(innovationHub.id);
  }
}
