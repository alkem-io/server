import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { GraphqlGuard } from '@core/authorization';
import {
  AgentLoaderCreator,
  SpaceAboutLoaderCreator,
  SpaceCollaborationLoaderCreator,
  SpaceCommunityLoaderCreator,
} from '@core/dataloader/creators';
import { LicenseLoaderCreator } from '@core/dataloader/creators/loader.creators/license.loader.creator';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';
import { IAgent } from '@domain/agent/agent';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { ILicense } from '@domain/common/license/license.interface';
import { LimitAndShuffleIdsQueryArgs } from '@domain/common/query-args/limit-and-shuffle.ids.query.args';
import { NameID } from '@domain/common/scalars';
import { ICommunity } from '@domain/community/community';
import { Space } from '@domain/space/space/space.entity';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceService } from '@domain/space/space/space.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ITemplatesManager } from '@domain/template/templates-manager';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
} from '@src/common/decorators';
import { IAccount } from '../account/account.interface';
import { ISpaceAbout } from '../space.about';
import { SpaceLookupService } from '../space.lookup/space.lookup.service';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { ISpaceSubscription } from './space.license.subscription.interface';

@Resolver(() => ISpace)
export class SpaceResolverFields {
  constructor(
    private spaceService: SpaceService,
    private spaceLookupService: SpaceLookupService
  ) {}

  @ResolveField('community', () => ICommunity, {
    nullable: false,
    description: 'Get the Community for the Space. ',
  })
  async community(
    @Parent() space: Space,
    @Loader(SpaceCommunityLoaderCreator, {
      parentClassRef: Space,
      checkParentPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<ICommunity>
  ): Promise<ICommunity> {
    return loader.load(space.id);
  }

  // TODO: consider making this protected by a heavy privilege?
  @ResolveField('platformAccess', () => IPlatformRolesAccess, {
    nullable: false,
    description: 'The calculated platform access for this Space.',
  })
  platformAccess(@Parent() space: ISpace): IPlatformRolesAccess {
    if (!space.platformRolesAccess) {
      return { roles: [] };
    }
    return space.platformRolesAccess;
  }

  @ResolveField('about', () => ISpaceAbout, {
    nullable: false,
    description: 'About this space.',
  })
  async about(
    @Parent() space: Space,
    @Loader(SpaceAboutLoaderCreator, {
      parentClassRef: Space,
      checkParentPrivilege: AuthorizationPrivilege.READ_ABOUT,
    })
    loader: ILoader<ISpaceAbout>
  ): Promise<ISpaceAbout> {
    return loader.load(space.id);
  }

  @ResolveField('subscriptions', () => [ISpaceSubscription], {
    nullable: false,
    description: 'The subscriptions active for this Space.',
  })
  async subscriptions(@Parent() space: ISpace) {
    return await this.spaceService.getSubscriptions(space);
  }

  @ResolveField('activeSubscription', () => ISpaceSubscription, {
    nullable: true,
    description: 'The "highest" subscription active for this Space.',
  })
  async activeSubscription(@Parent() space: ISpace) {
    return this.spaceService.activeSubscription(space);
  }

  @ResolveField('collaboration', () => ICollaboration, {
    nullable: false,
    description: 'The collaboration for the Space.',
  })
  async collaboration(
    @Parent() space: Space,
    @Loader(SpaceCollaborationLoaderCreator, {
      parentClassRef: Space,
      checkParentPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<ICollaboration>
  ): Promise<ICollaboration> {
    return loader.load(space.id);
  }

  @ResolveField('license', () => ILicense, {
    nullable: false,
    description: 'The License operating on this Space.',
  })
  async license(
    @Parent() space: ISpace,
    @Loader(LicenseLoaderCreator, {
      parentClassRef: Space,
      checkParentPrivilege: AuthorizationPrivilege.READ_LICENSE,
    })
    loader: ILoader<ILicense>
  ): Promise<ILicense> {
    return loader.load(space.id);
  }

  @ResolveField('agent', () => IAgent, {
    nullable: false,
    description: 'The Agent representing this Space.',
  })
  async agent(
    @Parent() space: Space,
    @Loader(AgentLoaderCreator, {
      parentClassRef: Space,
      checkParentPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<IAgent>
  ): Promise<IAgent> {
    return loader.load(space.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('storageAggregator', () => IStorageAggregator, {
    nullable: false,
    description: 'The StorageAggregator in use by this Space',
  })
  async storageAggregator(@Parent() space: Space): Promise<IStorageAggregator> {
    return await this.spaceService.getStorageAggregatorOrFail(space.id);
  }

  @ResolveField('subspaces', () => [ISpace], {
    nullable: false,
    description: 'The subspaces for the space.',
  })
  async subspaces(
    @Parent() space: ISpace,
    @Args({ nullable: true }) args: LimitAndShuffleIdsQueryArgs
  ): Promise<ISpace[]> {
    return await this.spaceService.getSubspaces(space, args);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('account', () => IAccount, {
    nullable: false,
    description: 'The Account that this Space is part of.',
  })
  async account(@Parent() space: ISpace): Promise<IAccount> {
    return await this.spaceService.getAccountForLevelZeroSpaceOrFail(space);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('subspaceByNameID', () => ISpace, {
    nullable: false,
    description: 'A particular subspace by its nameID',
  })
  async subspace(
    @Args('NAMEID', { type: () => NameID }) id: string,
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() space: ISpace
  ): Promise<ISpace> {
    const subspace =
      await this.spaceLookupService.getSubspaceByNameIdInLevelZeroSpace(
        id,
        space.levelZeroSpaceID
      );
    if (!subspace) {
      throw new EntityNotFoundException(
        `Unable to find subspace with ID: '${id}'`,
        LogContext.SPACES,
        { subspaceId: id, spaceId: space.id, userId: agentInfo.userID }
      );
    }
    return subspace;
  }

  @ResolveField('createdDate', () => Date, {
    nullable: true,
    description: 'The date for the creation of this Space.',
  })
  async createdDate(@Parent() space: Space): Promise<Date> {
    const createdDate = (space as Space).createdDate;
    return new Date(createdDate);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('settings', () => ISpaceSettings, {
    nullable: false,
    description: 'The settings for this Space.',
  })
  settings(@Parent() space: ISpace): ISpaceSettings {
    return space.settings;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('templatesManager', () => ITemplatesManager, {
    nullable: true,
    description: 'The TemplatesManager in use by this Space',
  })
  async templatesManager(@Parent() space: ISpace): Promise<ITemplatesManager> {
    return await this.spaceService.getTemplatesManagerOrFail(
      space.levelZeroSpaceID
    );
  }
}
