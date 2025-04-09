import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { ISpace } from '@domain/space/space/space.interface';
import { IProfile } from '@domain/common/profile';
import { AuthorizationAgentPrivilege, Profiling } from '@common/decorators';
import { Loader } from '@core/dataloader/decorators';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { IAccount } from '@domain/space/account/account.interface';
import { AccountLoaderCreator } from '@core/dataloader/creators/loader.creators/account/account.loader.creator';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';

@Resolver(() => IInnovationHub)
export class InnovationHubResolverFields {
  constructor(
    private innovationHubService: InnovationHubService,
    private spaceLookupService: SpaceLookupService
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

    const spaces = await this.spaceLookupService.getSpacesById(filter);
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

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
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

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('provider', () => IContributor, {
    nullable: false,
    description: 'The InnovationHub provider.',
  })
  @Profiling.api
  async provider(
    @Parent() innovationHub: IInnovationHub
  ): Promise<IContributor> {
    return await this.innovationHubService.getProvider(innovationHub.id);
  }
}
