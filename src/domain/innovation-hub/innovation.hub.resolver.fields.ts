import {
  AuthorizationActorHasPrivilege,
  CurrentActor,
  Profiling,
} from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { AccountLoaderCreator } from '@core/dataloader/creators/loader.creators/account/account.loader.creator';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IProfile } from '@domain/common/profile';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { IAccount } from '@domain/space/account/account.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

@Resolver(() => IInnovationHub)
export class InnovationHubResolverFields {
  constructor(
    private innovationHubService: InnovationHubService,
    private spaceLookupService: SpaceLookupService,
    private innovationPackService: InnovationPackService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private authorizationService: AuthorizationService
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

  @ResolveField(() => [IInnovationPack], {
    nullable: true,
    description:
      'The Innovation Packs curated for this Innovation Hub, in stored (curated) order, filtered to those the requesting agent may read.',
  })
  public async innovationPackListFilter(
    @CurrentActor() actorContext: ActorContext,
    @Parent() innovationHub: IInnovationHub
  ): Promise<IInnovationPack[] | undefined> {
    const filter =
      await this.innovationHubService.getInnovationPackListFilterOrFail(
        innovationHub.id
      );

    if (!filter) {
      return undefined;
    }

    const innovationPacks =
      await this.innovationPackService.getInnovationPacksByIds(filter, {
        relations: { authorization: true },
      });
    const result: IInnovationPack[] = [];
    for (const innovationPackId of filter) {
      const innovationPack = innovationPacks.find(
        pack => pack.id === innovationPackId
      );
      // Dangling IDs (deleted packs) are silently skipped; entries the
      // requesting agent may not READ are filtered out (FR-006).
      if (!innovationPack) continue;
      if (
        !innovationPack.authorization ||
        !this.authorizationService.isAccessGranted(
          actorContext,
          innovationPack.authorization,
          AuthorizationPrivilege.READ
        )
      ) {
        continue;
      }
      result.push(innovationPack);
    }
    return result;
  }

  @ResolveField(() => [IVirtualContributor], {
    nullable: true,
    description:
      'The Virtual Contributors curated for this Innovation Hub, in stored (curated) order, filtered to those the requesting agent may read.',
  })
  public async virtualContributorListFilter(
    @CurrentActor() actorContext: ActorContext,
    @Parent() innovationHub: IInnovationHub
  ): Promise<IVirtualContributor[] | undefined> {
    const filter =
      await this.innovationHubService.getVirtualContributorListFilterOrFail(
        innovationHub.id
      );

    if (!filter) {
      return undefined;
    }

    const virtualContributors =
      await this.virtualContributorLookupService.getVirtualContributorsByIds(
        filter,
        {
          relations: { authorization: true },
        }
      );
    const result: IVirtualContributor[] = [];
    for (const virtualContributorId of filter) {
      const virtualContributor = virtualContributors.find(
        vc => vc.id === virtualContributorId
      );
      // Dangling IDs (deleted VCs) are silently skipped; entries the
      // requesting agent may not READ (e.g. searchVisibility HIDDEN/ACCOUNT
      // for anonymous visitors) are filtered out (FR-006).
      if (!virtualContributor) continue;
      if (
        !virtualContributor.authorization ||
        !this.authorizationService.isAccessGranted(
          actorContext,
          virtualContributor.authorization,
          AuthorizationPrivilege.READ
        )
      ) {
        continue;
      }
      result.push(virtualContributor);
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
    @Loader(AccountLoaderCreator, {
      parentClassRef: InnovationHub,
      checkParentPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<IAccount>
  ) {
    return loader.load(innovationHub.id);
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('provider', () => IActor, {
    nullable: false,
    description: 'The InnovationHub provider.',
  })
  @Profiling.api
  async provider(@Parent() innovationHub: IInnovationHub): Promise<IActor> {
    return await this.innovationHubService.getProvider(innovationHub.id);
  }
}
