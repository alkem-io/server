import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Account } from '@domain/space/account/account.entity';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
} from '@src/common/decorators';
import { AccountService } from '@domain/space/account/account.service';
import { IAccount } from '@domain/space/account/account.interface';
import { ITemplatesSet } from '@domain/template/templates-set';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { ISpaceDefaults } from '../space.defaults/space.defaults.interface';
import {
  AccountDefaultsLoaderCreator,
  AccountLibraryLoaderCreator,
  AuthorizationLoaderCreator,
  AgentLoaderCreator,
  AccountVirtualContributorsLoaderCreator,
  AccountInnovationHubsLoaderCreator,
  AccountInnovationPacksLoaderCreator,
} from '@core/dataloader/creators/loader.creators';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { IAccountSubscription } from './account.license.subscription.interface';
import {
  IVirtualContributor,
  VirtualContributor,
} from '@domain/community/virtual-contributor';
import { AccountHostService } from '../account.host/account.host.service';
import { LicensePrivilege } from '@common/enums/license.privilege';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';

@Resolver(() => IAccount)
export class AccountResolverFields {
  constructor(
    private accountService: AccountService,
    private accountHostService: AccountHostService,
    private authorizationService: AuthorizationService
  ) {}

  @ResolveField('library', () => ITemplatesSet, {
    nullable: true,
    description: 'The Library in use by this Account',
  })
  @UseGuards(GraphqlGuard)
  async library(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() account: Account,
    @Loader(AccountLibraryLoaderCreator) loader: ILoader<ITemplatesSet>
  ): Promise<ITemplatesSet> {
    const accountWithAuth = await this.accountService.getAccountOrFail(
      account.id
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      accountWithAuth.authorization,
      AuthorizationPrivilege.READ,
      `read defaults on library: ${account.id}`
    );

    return loader.load(account.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('agent', () => IAgent, {
    nullable: false,
    description: 'The Agent representing this Account.',
  })
  async agent(
    @Parent() account: Account,
    @Loader(AgentLoaderCreator, { parentClassRef: Account })
    loader: ILoader<IAgent>
  ): Promise<IAgent> {
    return loader.load(account.id);
  }

  @ResolveField('defaults', () => ISpaceDefaults, {
    nullable: true,
    description: 'The defaults in use by this Account',
  })
  @UseGuards(GraphqlGuard)
  async defaults(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() account: Account,
    @Loader(AccountDefaultsLoaderCreator) loader: ILoader<ISpaceDefaults>
  ): Promise<ISpaceDefaults> {
    const accountWithAuth = await this.accountService.getAccountOrFail(
      account.id
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      accountWithAuth.authorization,
      AuthorizationPrivilege.READ,
      `read defaults on account: ${account.id}`
    );
    return loader.load(account.id);
  }

  @ResolveField('licensePrivileges', () => [LicensePrivilege], {
    nullable: true,
    description:
      'The privileges granted based on the License credentials held by this Account.',
  })
  async licensePrivileges(
    @Parent() account: IAccount
  ): Promise<LicensePrivilege[]> {
    return this.accountService.getLicensePrivileges(account);
  }

  @ResolveField('host', () => IContributor, {
    nullable: true,
    description: 'The Account host.',
  })
  async host(@Parent() account: Account): Promise<IContributor> {
    return await this.accountHostService.getHostOrFail(account);
  }

  @ResolveField('spaceID', () => String, {
    nullable: false,
    description: 'The ID for the root space for the Account .',
  })
  async spaceID(@Parent() account: Account): Promise<string> {
    const space = await this.accountService.getRootSpace(account);
    return space.id;
  }

  @ResolveField('authorization', () => IAuthorizationPolicy, {
    nullable: false,
    description: 'The Authorization for this Account.',
  })
  async authorization(
    @Parent() account: Account,
    @Loader(AuthorizationLoaderCreator, { parentClassRef: Account })
    loader: ILoader<IAuthorizationPolicy>
  ) {
    return loader.load(account.id);
  }

  @ResolveField('activeSubscription', () => IAccountSubscription, {
    nullable: true,
    description: 'The "highest" subscription active for this Account.',
  })
  async activeSubscription(@Parent() account: IAccount) {
    return this.accountService.activeSubscription(account);
  }

  @ResolveField('subscriptions', () => [IAccountSubscription], {
    nullable: false,
    description: 'The subscriptions active for this Account.',
  })
  async subscriptions(@Parent() account: IAccount) {
    return await this.accountService.getSubscriptions(account);
  }

  @ResolveField('virtualContributors', () => [IVirtualContributor], {
    nullable: false,
    description: 'The virtual contributors for this Account.',
  })
  async virtualContributors(
    @Parent() account: Account,
    @Loader(AccountVirtualContributorsLoaderCreator, {
      parentClassRef: Account,
    })
    loader: ILoader<VirtualContributor[]>
  ): Promise<IVirtualContributor[]> {
    return loader.load(account.id);
  }

  @ResolveField('innovationHubs', () => [IInnovationHub], {
    nullable: false,
    description: 'The InnovationHubs for this Account.',
  })
  async innovationHubs(
    @Parent() account: Account,
    @Loader(AccountInnovationHubsLoaderCreator, {
      parentClassRef: Account,
    })
    loader: ILoader<IInnovationHub[]>
  ): Promise<IInnovationHub[]> {
    return loader.load(account.id);
  }

  @ResolveField('innovationPacks', () => [IInnovationPack], {
    nullable: false,
    description: 'The InnovationPacks for this Account.',
  })
  async innovationPacks(
    @Parent() account: Account,
    @Loader(AccountInnovationPacksLoaderCreator, {
      parentClassRef: Account,
    })
    loader: ILoader<IInnovationPack[]>
  ): Promise<IInnovationPack[]> {
    return loader.load(account.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('storageAggregator', () => IStorageAggregator, {
    nullable: false,
    description: 'The StorageAggregator in use by this Account',
  })
  async storageAggregator(
    @Parent() account: Account
  ): Promise<IStorageAggregator> {
    return await this.accountService.getStorageAggregatorOrFail(account.id);
  }
}
