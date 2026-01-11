import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Account } from '@domain/space/account/account.entity';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationActorPrivilege } from '@src/common/decorators';
import { AccountService } from '@domain/space/account/account.service';
import { IAccount } from '@domain/space/account/account.interface';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import {
  AuthorizationLoaderCreator,
  AccountVirtualContributorsLoaderCreator,
  AccountInnovationHubsLoaderCreator,
  AccountInnovationPacksLoaderCreator,
  AccountSpacesLoaderCreator,
} from '@core/dataloader/creators/loader.creators';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { IActor } from '@domain/actor/actor/actor.interface';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ISpace } from '../space/space.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { IAccountSubscription } from './account.license.subscription.interface';
import { ILicense } from '@domain/common/license/license.interface';
import { LicenseLoaderCreator } from '@core/dataloader/creators/loader.creators/license.loader.creator';
import { AccountLookupService } from '../account.lookup/account.lookup.service';

@Resolver(() => IAccount)
export class AccountResolverFields {
  constructor(
    private accountService: AccountService,
    private accountLookupService: AccountLookupService
  ) {}

  @ResolveField('license', () => ILicense, {
    nullable: false,
    description: 'The License operating on this Account.',
  })
  async license(
    @Parent() account: Account,
    @Loader(LicenseLoaderCreator, {
      parentClassRef: Account,
      checkParentPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<ILicense>
  ): Promise<ILicense> {
    return loader.load(account.id);
  }

  @ResolveField('host', () => IActor, {
    nullable: true,
    description: 'The Account host.',
  })
  async host(@Parent() account: Account): Promise<IActor> {
    return await this.accountLookupService.getHostOrFail(account);
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

  @ResolveField('spaces', () => [ISpace], {
    nullable: false,
    description: 'The Spaces within this Account.',
  })
  async spaces(
    @Parent() account: Account,
    @Loader(AccountSpacesLoaderCreator, {
      parentClassRef: Account,
    })
    loader: ILoader<ISpace[]>
  ): Promise<ISpace[]> {
    return loader.load(account.id);
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

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
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

  @ResolveField('subscriptions', () => [IAccountSubscription], {
    nullable: false,
    description: 'The subscriptions active for this Account.',
  })
  async subscriptions(@Parent() account: Account) {
    return await this.accountService.getSubscriptions(account);
  }
}
