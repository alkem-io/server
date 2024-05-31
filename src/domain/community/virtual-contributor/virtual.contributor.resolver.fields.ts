import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { VirtualContributor } from './virtual.contributor.entity';
import { VirtualContributorService } from './virtual.contributor.service';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IProfile } from '@domain/common/profile';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
  Profiling,
} from '@common/decorators';
import { IAgent } from '@domain/agent/agent';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { Loader } from '@core/dataloader/decorators';
import {
  AccountLoaderCreator,
  AgentLoaderCreator,
  ProfileLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IVirtualContributor } from './virtual.contributor.interface';
import { VirtualStorageAggregatorLoaderCreator } from '@core/dataloader/creators/loader.creators/community/virtual.storage.aggregator.loader.creator';
import { IAccount } from '@domain/space/account/account.interface';

@Resolver(() => IVirtualContributor)
export class VirtualContributorResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private virtualService: VirtualContributorService
  ) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('authorization', () => IAuthorizationPolicy, {
    nullable: true,
    description: 'The Authorization for this Virtual.',
  })
  @Profiling.api
  async authorization(
    @Parent() parent: VirtualContributor,
    @CurrentUser() agentInfo: AgentInfo
  ) {
    // Reload to ensure the authorization is loaded
    const virtual = await this.virtualService.getVirtualContributorOrFail(
      parent.id
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtual.authorization,
      AuthorizationPrivilege.READ,
      `virtual authorization access: ${virtual.nameID}`
    );

    return virtual.authorization;
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The profile for this Virtual.',
  })
  @UseGuards(GraphqlGuard)
  async profile(
    @Parent() virtualContributor: VirtualContributor,
    @CurrentUser() agentInfo: AgentInfo,
    @Loader(ProfileLoaderCreator, { parentClassRef: VirtualContributor })
    loader: ILoader<IProfile>
  ) {
    const profile = await loader.load(virtualContributor.id);
    // Note: the Virtual profile is public.
    // Check if the user can read the profile entity, not the actual Virtual entity
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      profile.authorization,
      AuthorizationPrivilege.READ,
      `read profile on Virtual: ${profile.displayName}`
    );
    return profile;
  }

  @ResolveField('agent', () => IAgent, {
    nullable: false,
    description: 'The Agent representing this User.',
  })
  @Profiling.api
  async agent(
    @Parent() virtualContributor: VirtualContributor,
    @Loader(AgentLoaderCreator, { parentClassRef: VirtualContributor })
    loader: ILoader<IAgent>
  ): Promise<IAgent> {
    return loader.load(virtualContributor.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('storageAggregator', () => IStorageAggregator, {
    nullable: true,
    description:
      'The StorageAggregator for managing storage buckets in use by this Virtual',
  })
  @UseGuards(GraphqlGuard)
  async storageAggregator(
    @Parent() virtualContributor: VirtualContributor,
    @Loader(VirtualStorageAggregatorLoaderCreator)
    loader: ILoader<IStorageAggregator>
  ): Promise<IStorageAggregator> {
    return loader.load(virtualContributor.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('account', () => IAccount, {
    nullable: true,
    description: 'The Account of the Virtual Contributor.',
  })
  @Profiling.api
  @UseGuards(GraphqlGuard)
  async account(
    @Parent() virtualContributor: VirtualContributor,
    @Loader(AccountLoaderCreator, { parentClassRef: VirtualContributor })
    loader: ILoader<IAccount>
  ): Promise<IAccount | null> {
    let account: IAccount | never;
    try {
      account = await loader.load(virtualContributor.id);
    } catch (error) {
      return null;
    }
    return account;
  }
}
